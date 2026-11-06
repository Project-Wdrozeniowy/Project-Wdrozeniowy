package com.devpulse.ai.client;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Asks a language model which existing tags fit a post, through the
 * OpenAI-compatible {@code POST /chat/completions} API that many providers
 * and local servers offer.
 *
 * <p>Configured by {@code AI_BASE_URL} (for example
 * {@code https://api.groq.com/openai/v1}), {@code AI_API_KEY} and
 * {@code AI_MODEL}; without all three the client is not configured and is
 * never called. The title and the first {@value #MAX_CONTENT_CHARS}
 * characters of the content are sent to the provider; the key is never
 * logged. The model may only choose from the tags it is given: any
 * other answer is dropped, so the post content cannot make it return
 * arbitrary text.
 */
@Component
public class AiTagClient {

    /** Characters of the post content sent to the model; the rest is left out to bound the request. */
    static final int MAX_CONTENT_CHARS = 4000;

    private static final String SYSTEM_PROMPT = """
            You choose tags for a forum post. Answer with only a JSON array of tags, best first, \
            at most %d, taken exactly from the allowed tags. Answer [] when none fits.""";

    private final ObjectMapper json = new ObjectMapper();
    private final RestClient restClient;
    private final String apiKey;
    private final String model;
    private final boolean configured;

    @Autowired
    public AiTagClient(@Value("${ai.base-url:}") String baseUrl,
                       @Value("${ai.api-key:}") String apiKey,
                       @Value("${ai.model:}") String model,
                       @Value("${ai.timeout:10s}") Duration timeout) {
        this(baseUrl, apiKey, model, RestClient.builder().requestFactory(requestFactory(timeout)));
    }

    /** Builds the client on {@code builder}; tests pass one bound to a mock server. */
    AiTagClient(String baseUrl, String apiKey, String model, RestClient.Builder builder) {
        this.apiKey = apiKey;
        this.model = model;
        this.configured = StringUtils.hasText(baseUrl) && StringUtils.hasText(apiKey) && StringUtils.hasText(model);
        this.restClient = builder.baseUrl(StringUtils.hasText(baseUrl) ? stripTrailingSlash(baseUrl) : "").build();
    }

    /** Whether the base URL, key and model are all set. */
    public boolean isConfigured() {
        return configured;
    }

    /**
     * Returns up to {@code max} of {@code allowedTags} that fit the post, best
     * first, as the model ranks them. An empty list means none fits.
     *
     * @throws AiUnavailableException if the call fails, times out or the answer cannot be read
     */
    public List<String> chooseTags(String title, String content, List<String> allowedTags, int max) {
        String answer;
        try {
            answer = restClient.post()
                    .uri("/chat/completions")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .body(requestBody(title, content, allowedTags, max))
                    .retrieve()
                    .body(String.class);
        } catch (RestClientException e) {
            throw new AiUnavailableException("AI provider call failed: " + e.getMessage(), e);
        }
        return allowedOnly(tagsIn(answer), allowedTags, max);
    }

    private String requestBody(String title, String content, List<String> allowedTags, int max) {
        String post = content.length() > MAX_CONTENT_CHARS ? content.substring(0, MAX_CONTENT_CHARS) : content;
        String user = "Allowed tags: " + String.join(", ", allowedTags)
                + "\n\nTitle: " + (title == null ? "" : title)
                + "\n\nContent:\n" + post;
        try {
            return json.writeValueAsString(Map.of(
                    "model", model,
                    "temperature", 0,
                    "messages", List.of(
                            Map.of("role", "system", "content", SYSTEM_PROMPT.formatted(max)),
                            Map.of("role", "user", "content", user))));
        } catch (JsonProcessingException e) {
            throw new AiUnavailableException("AI request could not be written", e);
        }
    }

    /** The strings of the JSON array in the first choice's message. */
    private List<String> tagsIn(String answer) {
        try {
            String text = json.readTree(answer == null ? "" : answer)
                    .path("choices").path(0).path("message").path("content").asText("");
            int start = text.indexOf('[');
            int end = text.lastIndexOf(']');
            if (start < 0 || end < start) {
                throw new AiUnavailableException("AI answer has no JSON array");
            }
            JsonNode array = json.readTree(text.substring(start, end + 1));
            List<String> tags = new ArrayList<>();
            array.forEach(node -> {
                if (node.isTextual()) {
                    tags.add(node.asText());
                }
            });
            return tags;
        } catch (JsonProcessingException e) {
            throw new AiUnavailableException("AI answer is not valid JSON", e);
        }
    }

    private static List<String> allowedOnly(List<String> tags, List<String> allowedTags, int max) {
        Set<String> allowed = Set.copyOf(allowedTags);
        Set<String> chosen = new LinkedHashSet<>();
        for (String tag : tags) {
            String normalized = tag.strip().toLowerCase(Locale.ROOT);
            if (allowed.contains(normalized) && chosen.size() < max) {
                chosen.add(normalized);
            }
        }
        return List.copyOf(chosen);
    }

    private static SimpleClientHttpRequestFactory requestFactory(Duration timeout) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(timeout);
        factory.setReadTimeout(timeout);
        return factory;
    }

    private static String stripTrailingSlash(String url) {
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}

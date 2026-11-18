package com.devpulse.ai.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.http.client.MockClientHttpRequest;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/**
 * {@link AiTagClient} against a stubbed OpenAI-compatible provider: the
 * request it sends and how it reads, filters and rejects answers.
 */
class AiTagClientTest {

    private static final ObjectMapper JSON = new ObjectMapper();
    private static final List<String> ALLOWED = List.of("java", "spring-boot", "postgresql");

    private MockRestServiceServer server;
    private AiTagClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        client = new AiTagClient("https://ai.example.com/v1/", "test-key", "test-model", builder);
    }

    @Test
    void sendsAChatCompletionWithTheAllowedTagsAndReturnsTheChosenOnes() throws Exception {
        AtomicReference<JsonNode> sent = new AtomicReference<>();
        server.expect(requestTo("https://ai.example.com/v1/chat/completions"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer test-key"))
                .andExpect(request -> sent.set(JSON.readTree(((MockClientHttpRequest) request).getBodyAsString())))
                .andRespond(withSuccess(answer("[\"spring-boot\", \"postgresql\"]"), MediaType.APPLICATION_JSON));

        List<String> tags = client.chooseTags("Setup", "Spring Boot with PostgreSQL", ALLOWED, 5);

        assertThat(tags).containsExactly("spring-boot", "postgresql");
        JsonNode body = sent.get();
        assertThat(body.path("model").asText()).isEqualTo("test-model");
        assertThat(body.path("temperature").asInt()).isZero();
        assertThat(body.path("messages").path(0).path("role").asText()).isEqualTo("system");
        assertThat(body.path("messages").path(0).path("content").asText()).contains("at most 5");
        String user = body.path("messages").path(1).path("content").asText();
        assertThat(user).contains("Allowed tags: java, spring-boot, postgresql", "Title: Setup",
                "Spring Boot with PostgreSQL");
        server.verify();
    }

    @Test
    void tagsOutsideTheAllowedOnesAreDroppedAndTheRestNormalisedAndCapped() {
        server.expect(requestTo("https://ai.example.com/v1/chat/completions"))
                .andRespond(withSuccess(answer("Sure: [\" JAVA \", \"rust\", 7, \"java\", \"postgresql\", \"spring-boot\"]"),
                        MediaType.APPLICATION_JSON));

        assertThat(client.chooseTags(null, "content", ALLOWED, 2)).containsExactly("java", "postgresql");
    }

    @Test
    void longContentIsCutBeforeItIsSent() throws Exception {
        AtomicReference<String> user = new AtomicReference<>();
        server.expect(requestTo("https://ai.example.com/v1/chat/completions"))
                .andExpect(request -> user.set(JSON.readTree(((MockClientHttpRequest) request).getBodyAsString())
                        .path("messages").path(1).path("content").asText()))
                .andRespond(withSuccess(answer("[]"), MediaType.APPLICATION_JSON));

        assertThat(client.chooseTags("T", "a".repeat(AiTagClient.MAX_CONTENT_CHARS) + "TAIL", ALLOWED, 5)).isEmpty();
        assertThat(user.get()).endsWith("a".repeat(10)).doesNotContain("TAIL");
    }

    @Test
    void anErrorStatusIsUnavailable() {
        server.expect(requestTo("https://ai.example.com/v1/chat/completions"))
                .andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS));

        assertThatThrownBy(() -> client.chooseTags("T", "content", ALLOWED, 5))
                .isInstanceOf(AiUnavailableException.class);
    }

    @Test
    void anAnswerWithoutAJsonArrayIsUnavailable() {
        server.expect(requestTo("https://ai.example.com/v1/chat/completions"))
                .andRespond(withSuccess(answer("I would pick java."), MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> client.chooseTags("T", "content", ALLOWED, 5))
                .isInstanceOf(AiUnavailableException.class)
                .hasMessageContaining("no JSON array");
    }

    @Test
    void aBodyThatIsNotJsonIsUnavailable() {
        server.expect(requestTo("https://ai.example.com/v1/chat/completions"))
                .andRespond(withSuccess("<html>gateway error</html>", MediaType.TEXT_HTML));

        assertThatThrownBy(() -> client.chooseTags("T", "content", ALLOWED, 5))
                .isInstanceOf(AiUnavailableException.class);
    }

    @Test
    void anArrayThatIsNotJsonIsUnavailable() {
        server.expect(requestTo("https://ai.example.com/v1/chat/completions"))
                .andRespond(withSuccess(answer("[java, spring]"), MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> client.chooseTags("T", "content", ALLOWED, 5))
                .isInstanceOf(AiUnavailableException.class)
                .hasMessageContaining("not valid JSON");
    }

    @Test
    void theClientIsConfiguredOnlyWithBaseUrlKeyAndModel() {
        RestClient.Builder builder = RestClient.builder();
        assertThat(client.isConfigured()).isTrue();
        assertThat(new AiTagClient("", "key", "model", builder).isConfigured()).isFalse();
        assertThat(new AiTagClient("https://ai.example.com", " ", "model", builder).isConfigured()).isFalse();
        assertThat(new AiTagClient("https://ai.example.com", "key", null, builder).isConfigured()).isFalse();
    }

    @Test
    void theSpringConstructorBuildsAnUnconfiguredClientByDefault() {
        assertThat(new AiTagClient("", "", "", java.time.Duration.ofSeconds(1)).isConfigured()).isFalse();
    }

    /** A chat-completions response whose first choice says {@code content}. */
    private static String answer(String content) {
        try {
            return JSON.writeValueAsString(java.util.Map.of("choices",
                    List.of(java.util.Map.of("message", java.util.Map.of("role", "assistant", "content", content)))));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}

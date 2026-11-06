package com.devpulse.ai.service;

import com.devpulse.ai.client.AiTagClient;
import com.devpulse.ai.client.AiUnavailableException;
import com.devpulse.ai.dto.SuggestTagsRequest;
import com.devpulse.ai.dto.TagSuggestionsDto;
import com.devpulse.exception.AppException;
import com.devpulse.forum.entity.Tag;
import com.devpulse.forum.repository.TagRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Suggests tags for post content.
 *
 * <p>When the AI provider is configured and tags exist, the model chooses up
 * to {@link #MAX_SUGGESTIONS} of the {@link #VOCABULARY_SIZE} most used tags
 * ({@code aiGenerated: true}). When it is not configured, fails, or chooses
 * none, {@link KeywordTagExtractor} suggests tags from the words of the post
 * ({@code aiGenerated: false}). Only when that fails too is the answer a 503.
 *
 * <p>Deliberately not transactional: the provider call can take seconds and
 * must not hold a database connection.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TagSuggestionService {

    /** Most tags one suggestion returns. */
    public static final int MAX_SUGGESTIONS = 5;

    /** Number of most used tags the model may choose from. */
    static final int VOCABULARY_SIZE = 200;

    private final AiTagClient aiTagClient;
    private final KeywordTagExtractor keywordTagExtractor;
    private final TagRepository tagRepository;

    /**
     * Suggests up to {@link #MAX_SUGGESTIONS} tags, best first.
     *
     * @throws AppException HTTP 503 if neither the provider nor the keyword extraction can answer
     */
    public TagSuggestionsDto suggest(SuggestTagsRequest request) {
        List<String> vocabulary = tagRepository.findInUse(PageRequest.of(0, VOCABULARY_SIZE)).stream()
                .map(Tag::getSlug)
                .toList();

        if (aiTagClient.isConfigured() && !vocabulary.isEmpty()) {
            try {
                List<String> tags = aiTagClient.chooseTags(
                        request.getTitle(), request.getContent(), vocabulary, MAX_SUGGESTIONS);
                if (!tags.isEmpty()) {
                    return new TagSuggestionsDto(tags, true);
                }
            } catch (AiUnavailableException e) {
                log.warn("AI tag suggestions unavailable, using keyword extraction: {}", e.getMessage());
            }
        }

        try {
            return new TagSuggestionsDto(keywordTagExtractor.extract(
                    request.getTitle(), request.getContent(), vocabulary, MAX_SUGGESTIONS), false);
        } catch (RuntimeException e) {
            log.error("Keyword tag extraction failed", e);
            throw new AppException("Tag suggestions are unavailable", HttpStatus.SERVICE_UNAVAILABLE);
        }
    }
}

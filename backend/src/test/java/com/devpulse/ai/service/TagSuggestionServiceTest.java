package com.devpulse.ai.service;

import com.devpulse.ai.client.AiTagClient;
import com.devpulse.ai.client.AiUnavailableException;
import com.devpulse.ai.dto.SuggestTagsRequest;
import com.devpulse.ai.dto.TagSuggestionsDto;
import com.devpulse.exception.AppException;
import com.devpulse.forum.entity.Tag;
import com.devpulse.forum.repository.TagRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** How {@link TagSuggestionService} chooses between the stubbed AI provider and the keyword extraction. */
@ExtendWith(MockitoExtension.class)
class TagSuggestionServiceTest {

    private static final List<String> VOCABULARY = List.of("java", "spring-boot");
    private static final String TITLE = "Spring Boot";
    private static final String CONTENT = "Spring Boot on Java";

    @Mock private AiTagClient aiTagClient;
    @Mock private KeywordTagExtractor keywordTagExtractor;
    @Mock private TagRepository tagRepository;
    @InjectMocks private TagSuggestionService service;

    private SuggestTagsRequest request;

    @BeforeEach
    void setUp() throws Exception {
        request = new ObjectMapper().readValue(
                "{\"title\": \"%s\", \"content\": \"%s\"}".formatted(TITLE, CONTENT), SuggestTagsRequest.class);
        lenient().when(tagRepository.findInUse(PageRequest.of(0, TagSuggestionService.VOCABULARY_SIZE)))
                .thenReturn(VOCABULARY.stream().map(slug -> Tag.builder().name(slug).slug(slug).build()).toList());
        lenient().when(keywordTagExtractor.extract(TITLE, CONTENT, VOCABULARY, TagSuggestionService.MAX_SUGGESTIONS))
                .thenReturn(List.of("spring-boot", "java"));
    }

    @Test
    void theProvidersChoiceIsAiGenerated() {
        when(aiTagClient.isConfigured()).thenReturn(true);
        when(aiTagClient.chooseTags(TITLE, CONTENT, VOCABULARY, TagSuggestionService.MAX_SUGGESTIONS))
                .thenReturn(List.of("java"));

        assertThat(service.suggest(request)).satisfies(dto -> {
            assertThat(dto.getTags()).containsExactly("java");
            assertThat(dto.isAiGenerated()).isTrue();
        });
        verify(keywordTagExtractor, never()).extract(any(), any(), anyList(), anyInt());
    }

    @Test
    void anUnconfiguredProviderIsNeverCalled() {
        when(aiTagClient.isConfigured()).thenReturn(false);

        assertKeywordResult(service.suggest(request));
        verify(aiTagClient, never()).chooseTags(any(), any(), anyList(), anyInt());
    }

    @Test
    void aFailingProviderFallsBackToKeywords() {
        when(aiTagClient.isConfigured()).thenReturn(true);
        when(aiTagClient.chooseTags(any(), any(), anyList(), anyInt()))
                .thenThrow(new AiUnavailableException("timed out"));

        assertKeywordResult(service.suggest(request));
    }

    @Test
    void aProviderThatChoosesNothingFallsBackToKeywords() {
        when(aiTagClient.isConfigured()).thenReturn(true);
        when(aiTagClient.chooseTags(any(), any(), anyList(), anyInt())).thenReturn(List.of());

        assertKeywordResult(service.suggest(request));
    }

    @Test
    void withoutExistingTagsTheProviderIsNotAsked() {
        when(aiTagClient.isConfigured()).thenReturn(true);
        when(tagRepository.findInUse(any())).thenReturn(List.of());
        when(keywordTagExtractor.extract(TITLE, CONTENT, List.of(), TagSuggestionService.MAX_SUGGESTIONS))
                .thenReturn(List.of("spring"));

        TagSuggestionsDto dto = service.suggest(request);

        assertThat(dto.getTags()).containsExactly("spring");
        assertThat(dto.isAiGenerated()).isFalse();
        verify(aiTagClient, never()).chooseTags(any(), any(), anyList(), anyInt());
    }

    @Test
    void whenTheProviderAndTheKeywordsBothFailTheAnswerIs503() {
        when(aiTagClient.isConfigured()).thenReturn(true);
        when(aiTagClient.chooseTags(any(), any(), anyList(), anyInt()))
                .thenThrow(new AiUnavailableException("down"));
        when(keywordTagExtractor.extract(any(), any(), anyList(), anyInt()))
                .thenThrow(new IllegalStateException("broken"));

        assertThatThrownBy(() -> service.suggest(request))
                .isInstanceOfSatisfying(AppException.class, e -> {
                    assertThat(e.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
                    assertThat(e.getMessage()).isEqualTo("Tag suggestions are unavailable");
                });
    }

    private static void assertKeywordResult(TagSuggestionsDto dto) {
        assertThat(dto.getTags()).containsExactly("spring-boot", "java");
        assertThat(dto.isAiGenerated()).isFalse();
    }
}

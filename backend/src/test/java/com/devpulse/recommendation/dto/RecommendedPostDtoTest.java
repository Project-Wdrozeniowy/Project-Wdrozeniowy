package com.devpulse.recommendation.dto;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RecommendedPostDtoTest {

    @Test
    void aShortContentIsTheWholeExcerptWithWhitespaceCollapsed() {
        assertThat(RecommendedPostDto.excerpt("\n  Spring   Boot\tand\nFlyway  ")).isEqualTo("Spring Boot and Flyway");
    }

    @Test
    void aLongContentIsCutAfterTheExcerptLengthWithAnEllipsis() {
        String content = "word ".repeat(100);

        String excerpt = RecommendedPostDto.excerpt(content);

        // 200 characters end on the space after the 40th word, which is dropped before the ellipsis.
        assertThat(excerpt).isEqualTo("word ".repeat(39) + "word…");
        assertThat(excerpt).hasSize(RecommendedPostDto.EXCERPT_LENGTH);
    }

    @Test
    void aContentOfExactlyTheExcerptLengthIsNotCut() {
        String content = "x".repeat(RecommendedPostDto.EXCERPT_LENGTH);

        assertThat(RecommendedPostDto.excerpt(content)).isEqualTo(content);
    }
}

package com.devpulse.ai.service;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class KeywordTagExtractorTest {

    private final KeywordTagExtractor extractor = new KeywordTagExtractor();

    @Test
    void existingTagsInTheTextComeFirstThenFrequentWords() {
        List<String> tags = extractor.extract("Spring Boot and PostgreSQL",
                "Configure Flyway migrations for PostgreSQL. Flyway runs before Spring Boot starts.",
                List.of("java", "spring-boot", "postgresql"), 5);

        // spring-boot: title 3 + content 1; postgresql: title 3 + content 1, after spring-boot in the given order.
        // Then flyway (2), then configure, migrations, runs, starts (1 each) in order of appearance.
        assertThat(tags).containsExactly("spring-boot", "postgresql", "flyway", "configure", "migrations");
    }

    @Test
    void aTitleMatchWeighsThreeContentMatches() {
        List<String> tags = extractor.extract("Docker", "kubernetes kubernetes docker kubernetes", List.of(), 2);

        // docker: 3 (title) + 1; kubernetes: 3.
        assertThat(tags).containsExactly("docker", "kubernetes");
    }

    @Test
    void commonWordsShortWordsAndNumbersAreNotTags() {
        List<String> tags = extractor.extract(null,
                "This is how we should do it in 2026: the API and the API, jest bardzo dobrze", List.of(), 10);

        assertThat(tags).containsExactly("api", "dobrze");
    }

    @Test
    void wordsOfASuggestedTagAreNotSuggestedAgain() {
        List<String> tags = extractor.extract("Spring Boot tips", "Spring is great, boot it up", List.of("spring-boot"), 5);

        assertThat(tags).containsExactly("spring-boot", "tips", "great");
    }

    @Test
    void accentsAndPunctuationAreIgnored() {
        assertThat(KeywordTagExtractor.normalize("Żółć — Łódź, C++/C#!")).isEqualTo("zolc lodz c c");
        assertThat(extractor.extract("Zażółć gęślą jaźń", "Łódź", List.of(), 5))
                .containsExactly("zazolc", "gesla", "jazn", "lodz");
    }

    @Test
    void aTagIsMatchedOnWholeWordsOnly() {
        assertThat(extractor.extract(null, "javascript everywhere", List.of("java"), 5))
                .containsExactly("javascript", "everywhere");
    }

    @Test
    void repeatedPhrasesAreCountedEachTime() {
        assertThat(extractor.extract(null, "go go go rust", List.of("rust", "go"), 1)).containsExactly("go");
    }

    @Test
    void theNumberOfSuggestionsIsCapped() {
        assertThat(extractor.extract(null, "alpha beta gamma delta epsilon zeta", List.of(), 3))
                .containsExactly("alpha", "beta", "gamma");
        assertThat(extractor.extract(null, "the and for", List.of(), 5)).isEmpty();
    }
}

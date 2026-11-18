package com.devpulse.ai.service;

import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Suggests tags from the words of a post, without any external service.
 *
 * <p>The text is lower-cased, accents are removed and everything other than
 * letters and digits separates words. A word or phrase in the title counts
 * three times, one in the content once. Suggestions, best first:
 * <ol>
 *   <li>existing tags whose words appear in the text (a tag
 *       {@code spring-boot} matches "Spring Boot"), by count, then in the
 *       order given (most used first);</li>
 *   <li>then other words of at least three characters that are not common
 *       English or Polish words, digits only, or part of a tag already
 *       suggested, by count, then by first appearance.</li>
 * </ol>
 */
@Component
public class KeywordTagExtractor {

    /** Weight of a match in the title; a match in the content counts once. */
    static final int TITLE_WEIGHT = 3;

    private static final int MIN_WORD_LENGTH = 3;
    private static final int MAX_TAG_LENGTH = 50;

    /** Common English and Polish words, written without accents as {@link #normalize} leaves them. */
    private static final Set<String> STOP_WORDS = Set.of((
            // English
            "the and for are but not you all any can had her was one our out has have him his how "
            + "its may new now see two way ways who did get let put say she too use that this with "
            + "from they them then than there these those what when where which while will would could "
            + "should about after again also been before being both each into just like more most much "
            + "must only other over some such very your yours here why because does doing done using "
            + "used make made want need know think thing things really able yes well even still back "
            + "good best first last many every same between through without within under above below "
            + "upon onto off per via etc "
            // Polish
            + "jak jest nie ale czy dla tak juz sie oraz albo lub tez przez przy pod nad bez jako ten "
            + "tym tego temu tej te tych ktore ktory ktora jaki jaka jakie kiedy gdzie dlaczego bardzo "
            + "moze mozna tylko jeszcze wszystko byl byla bylo sa byc mam masz mamy macie maja czyli "
            + "wiec zeby jednak tutaj tam").split(" "));

    /**
     * Returns up to {@code max} suggested tags for the post, best first.
     *
     * @param knownTags existing tag slugs, most used first
     */
    public List<String> extract(String title, String content, List<String> knownTags, int max) {
        String titleText = " " + normalize(title) + " ";
        String contentText = " " + normalize(content) + " ";
        Set<String> suggestions = new LinkedHashSet<>();

        knownTags.stream()
                .map(tag -> Map.entry(tag, score(titleText, contentText, " " + tag.replace('-', ' ') + " ")))
                .filter(entry -> entry.getValue() > 0)
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(max)
                .forEach(entry -> suggestions.add(entry.getKey()));

        Set<String> taken = new LinkedHashSet<>();
        suggestions.forEach(tag -> taken.addAll(Arrays.asList(tag.split("-"))));
        Map<String, Integer> words = new LinkedHashMap<>();
        countWords(titleText, TITLE_WEIGHT, words);
        countWords(contentText, 1, words);
        words.entrySet().stream()
                .filter(entry -> !taken.contains(entry.getKey()))
                .sorted(Comparator.comparing(Map.Entry<String, Integer>::getValue).reversed())
                .limit(Math.max(0, max - suggestions.size()))
                .forEach(entry -> suggestions.add(entry.getKey()));

        return List.copyOf(suggestions);
    }

    /** Weighted number of times {@code phrase}, with surrounding spaces, occurs in the title and content. */
    private static int score(String titleText, String contentText, String phrase) {
        return TITLE_WEIGHT * occurrences(titleText, phrase) + occurrences(contentText, phrase);
    }

    private static int occurrences(String text, String phrase) {
        int count = 0;
        for (int at = text.indexOf(phrase); at >= 0; at = text.indexOf(phrase, at + phrase.length() - 1)) {
            count++;
        }
        return count;
    }

    private static void countWords(String text, int weight, Map<String, Integer> words) {
        for (String word : text.strip().split(" ")) {
            if (isKeyword(word)) {
                words.merge(word, weight, Integer::sum);
            }
        }
    }

    private static boolean isKeyword(String word) {
        return word.length() >= MIN_WORD_LENGTH
                && word.length() <= MAX_TAG_LENGTH
                && !word.chars().allMatch(Character::isDigit)
                && !STOP_WORDS.contains(word);
    }

    /** Lower-case ASCII letters and digits separated by single spaces. */
    static String normalize(String text) {
        if (text == null) {
            return "";
        }
        return Normalizer.normalize(text, Normalizer.Form.NFKD)
                .replaceAll("\\p{M}+", "")
                .replace('ł', 'l').replace('Ł', 'L')
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", " ")
                .strip();
    }
}

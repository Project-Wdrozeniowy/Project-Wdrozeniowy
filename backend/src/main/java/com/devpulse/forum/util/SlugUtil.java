package com.devpulse.forum.util;

import java.text.Normalizer;
import java.util.Locale;
import java.util.function.Predicate;

/**
 * Small helper that converts a free-form title into a URL-safe slug and
 * resolves collisions by suffixing a numeric counter.
 */
public final class SlugUtil {

    private SlugUtil() {
    }

    /**
     * Maximum slug length, matching the {@code posts.slug} column width.
     */
    public static final int MAX_LENGTH = 300;

    /**
     * Produces a kebab-case slug from the given title. Non-ASCII characters
     * are stripped, whitespace and punctuation are collapsed to single dashes.
     *
     * @param title human-readable title
     * @return URL-safe slug, never blank ({@code "post"} is used as a fallback)
     */
    public static String slugify(String title) {
        if (title == null) {
            return "post";
        }
        String normalized = Normalizer.normalize(title, Normalizer.Form.NFKD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-+)|(-+$)", "");
        if (normalized.isBlank()) {
            normalized = "post";
        }
        if (normalized.length() > MAX_LENGTH) {
            normalized = normalized.substring(0, MAX_LENGTH);
        }
        return normalized;
    }

    /**
     * Returns a unique slug derived from {@code title}, probing {@code base},
     * {@code base-2}, {@code base-3}, ... until {@code exists} reports false.
     *
     * @param title  human-readable title
     * @param exists predicate that returns {@code true} when a slug is taken
     * @return the first slug for which {@code exists} returns {@code false}
     */
    public static String uniqueSlug(String title, Predicate<String> exists) {
        String base = slugify(title);
        String candidate = base;
        int suffix = 2;
        while (exists.test(candidate)) {
            String tail = "-" + suffix;
            int max = MAX_LENGTH - tail.length();
            String head = base.length() > max ? base.substring(0, max) : base;
            candidate = head + tail;
            suffix++;
        }
        return candidate;
    }
}

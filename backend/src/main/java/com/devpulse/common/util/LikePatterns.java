package com.devpulse.common.util;

import java.util.Locale;

/**
 * Builds SQL {@code LIKE} patterns from user input.
 */
public final class LikePatterns {

    /** Escape character of the patterns; queries pass it as the {@code ESCAPE} of the {@code LIKE}. */
    public static final char ESCAPE = '\\';

    private LikePatterns() {
    }

    /**
     * A lower-case pattern matching values that contain {@code text}, for a
     * case-insensitive comparison against {@code lower(column)}. {@code %} and
     * {@code _} in {@code text} match literally, so searching for "100%" does
     * not turn into a wildcard.
     */
    public static String containing(String text) {
        String escaped = text.toLowerCase(Locale.ROOT)
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
        return "%" + escaped + "%";
    }
}

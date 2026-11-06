package com.devpulse.common.validation;

/**
 * Regular expressions shared by request DTOs in {@code @Pattern} constraints.
 */
public final class ValidationPatterns {

    /**
     * Matches any text with at least one non-whitespace character. Written
     * without inline flags, so it is also a valid ECMAScript pattern in the
     * published OpenAPI document.
     */
    public static final String NOT_BLANK = "[\\s\\S]*\\S[\\s\\S]*";

    /**
     * Matches a URL slug: groups of lower-case letters and digits joined by
     * single hyphens, such as {@code general-discussion}. Anchored, because
     * an ECMAScript pattern matches anywhere in the text.
     */
    public static final String SLUG = "^[a-z0-9]+(-[a-z0-9]+)*$";

    private ValidationPatterns() {
    }
}

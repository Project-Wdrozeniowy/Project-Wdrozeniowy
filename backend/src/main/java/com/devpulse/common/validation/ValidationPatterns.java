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

    private ValidationPatterns() {
    }
}

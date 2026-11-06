package com.devpulse.ai.client;

/**
 * The AI provider could not answer: the call failed or timed out, or its
 * answer could not be read. Callers fall back to keyword extraction.
 */
public class AiUnavailableException extends RuntimeException {

    public AiUnavailableException(String message) {
        super(message);
    }

    public AiUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}

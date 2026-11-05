package com.devpulse.exception;

import org.springframework.http.HttpStatus;

import java.util.Map;

/**
 * Domain exception with an associated HTTP status.
 *
 * <p>Thrown by services in business-level error situations (e.g. duplicate user,
 * invalid token). Caught by {@link GlobalExceptionHandler},
 * which converts it into an RFC 9457 (Problem Details) response.
 *
 * <p>Usage example:
 * <pre>
 * throw new AppException("Username already taken", HttpStatus.CONFLICT);
 * </pre>
 *
 * <p>When the error is caused by particular request fields, they can be named
 * with messages for the user; the response then carries them in its
 * {@code errors} map, as validation errors do.
 */
public class AppException extends RuntimeException {

    /** HTTP status returned to the client in the error response. */
    private final HttpStatus status;

    /** Messages by request field name; empty when no field is to blame. */
    private final Map<String, String> fieldErrors;

    /**
     * Creates an exception with a message and an HTTP status.
     *
     * @param message the error message returned in the {@code detail} field of the response
     * @param status  the HTTP status of the response (e.g. 409 CONFLICT, 401 UNAUTHORIZED)
     */
    public AppException(String message, HttpStatus status) {
        this(message, status, Map.of());
    }

    /**
     * Creates an exception caused by the given request fields.
     *
     * @param message     the error message returned in the {@code detail} field of the response
     * @param status      the HTTP status of the response
     * @param fieldErrors messages by request field name, returned in the {@code errors} field
     */
    public AppException(String message, HttpStatus status, Map<String, String> fieldErrors) {
        super(message);
        this.status = status;
        this.fieldErrors = Map.copyOf(fieldErrors);
    }

    /**
     * Returns the HTTP status associated with this exception.
     *
     * @return the HTTP status
     */
    public HttpStatus getStatus() {
        return status;
    }

    /**
     * Returns the messages by request field name.
     *
     * @return an unmodifiable map, empty when no field is to blame
     */
    public Map<String, String> getFieldErrors() {
        return fieldErrors;
    }
}

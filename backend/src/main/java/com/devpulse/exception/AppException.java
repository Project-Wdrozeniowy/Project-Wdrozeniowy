package com.devpulse.exception;

import org.springframework.http.HttpStatus;

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
 */
public class AppException extends RuntimeException {

    /** HTTP status returned to the client in the error response. */
    private final HttpStatus status;

    /**
     * Creates an exception with a message and an HTTP status.
     *
     * @param message the error message returned in the {@code detail} field of the response
     * @param status  the HTTP status of the response (e.g. 409 CONFLICT, 401 UNAUTHORIZED)
     */
    public AppException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }

    /**
     * Returns the HTTP status associated with this exception.
     *
     * @return the HTTP status
     */
    public HttpStatus getStatus() {
        return status;
    }
}

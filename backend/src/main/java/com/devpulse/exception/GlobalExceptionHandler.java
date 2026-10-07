package com.devpulse.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

/**
 * Global exception handler for all REST controllers.
 *
 * <p>Converts application exceptions into a unified HTTP response format
 * conforming to RFC 9457 (Problem Details for HTTP APIs), natively supported
 * by Spring 6+ via the {@link ProblemDetail} class.
 *
 * <p>Handled cases:
 * <ul>
 *   <li>{@link AppException} — domain errors (409, 401, 404, etc.)</li>
 *   <li>{@link MethodArgumentNotValidException} — Bean Validation errors ({@code @Valid})</li>
 *   <li>{@link AccessDeniedException} — authenticated caller lacks the required role (403)</li>
 *   <li>{@link AuthenticationException} — failed login (401)</li>
 *   <li>{@link Exception} — unexpected errors (500 Internal Server Error)</li>
 * </ul>
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * Handles domain errors thrown by application services.
     *
     * @param ex the domain exception with an HTTP status and message
     * @return a {@link ProblemDetail} with the appropriate status and message
     */
    @ExceptionHandler(AppException.class)
    public ProblemDetail handleAppException(AppException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(ex.getStatus(), ex.getMessage());
        pd.setTitle(ex.getStatus().getReasonPhrase());
        return pd;
    }

    /**
     * Handles field validation errors in HTTP requests ({@code @Valid}).
     *
     * <p>The response contains an {@code errors} map with field names and
     * constraint violation messages (e.g. {@code "username": "size must be between 3 and 50"}).
     *
     * @param ex the exception containing the list of validation errors
     * @return a {@link ProblemDetail} 400 with a map of field-level errors
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            errors.put(fe.getField(), fe.getDefaultMessage());
        }
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Validation failed");
        pd.setTitle("Validation Error");
        pd.setProperty("errors", errors);
        return pd;
    }

    /**
     * Handles authorization failures raised by {@code @PreAuthorize}
     * and other Spring Security checks once the user is authenticated
     * but lacks the required authority.
     *
     * @param ex the access-denied exception
     * @return a {@link ProblemDetail} 403 with a generic message
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ProblemDetail handleAccessDenied(AccessDeniedException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                HttpStatus.FORBIDDEN, "Access is denied");
        pd.setTitle(HttpStatus.FORBIDDEN.getReasonPhrase());
        return pd;
    }

    /**
     * Handles authentication failures that surface inside a controller call,
     * most notably {@code BadCredentialsException} thrown by the
     * {@code AuthenticationManager} on {@code POST /auth/login}. Without this
     * handler such failures would fall through to the generic handler and be
     * reported as a 500.
     *
     * <p>Requests rejected earlier, inside the security filter chain (missing or
     * invalid JWT), never reach MVC advice; those are answered by the
     * {@code AuthenticationEntryPoint} configured in
     * {@link com.devpulse.config.SecurityConfig}.
     *
     * @param ex the authentication exception
     * @return a {@link ProblemDetail} 401 with a generic message
     */
    @ExceptionHandler(AuthenticationException.class)
    public ProblemDetail handleAuthentication(AuthenticationException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                HttpStatus.UNAUTHORIZED, "Authentication failed");
        pd.setTitle(HttpStatus.UNAUTHORIZED.getReasonPhrase());
        return pd;
    }

    /**
     * Fallback handler for all unhandled exceptions.
     * Logs the full stack trace server-side and returns 500 without exposing
     * implementation details to the client.
     *
     * @param ex the unhandled exception
     * @return a {@link ProblemDetail} 500 with a generic message
     */
    @ExceptionHandler(Exception.class)
    public ProblemDetail handleGeneric(Exception ex) {
        log.error("Unhandled exception", ex);
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred");
        pd.setTitle("Internal Server Error");
        return pd;
    }
}

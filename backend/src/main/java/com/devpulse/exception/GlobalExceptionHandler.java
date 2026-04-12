package com.devpulse.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

/**
 * Глобальный обработчик исключений для всех REST-контроллеров.
 *
 * <p>Преобразует исключения приложения в унифицированный формат HTTP-ответа
 * согласно RFC 9457 (Problem Details for HTTP APIs), нативно поддерживаемый
 * Spring 6+ через класс {@link ProblemDetail}.
 *
 * <p>Обрабатываемые случаи:
 * <ul>
 *   <li>{@link AppException} — доменные ошибки (409, 401, 404 и т.д.)</li>
 *   <li>{@link MethodArgumentNotValidException} — ошибки валидации Bean Validation (@Valid)</li>
 *   <li>{@link Exception} — непредвиденные ошибки (500 Internal Server Error)</li>
 * </ul>
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Обрабатывает доменные ошибки, выброшенные сервисами приложения.
     *
     * @param ex доменное исключение с HTTP-статусом и сообщением
     * @return {@link ProblemDetail} с соответствующим статусом и сообщением
     */
    @ExceptionHandler(AppException.class)
    public ProblemDetail handleAppException(AppException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(ex.getStatus(), ex.getMessage());
        pd.setTitle(ex.getStatus().getReasonPhrase());
        return pd;
    }

    /**
     * Обрабатывает ошибки валидации полей в HTTP-запросах ({@code @Valid}).
     *
     * <p>Ответ содержит карту {@code errors} с именами полей и сообщениями
     * нарушенных ограничений (например, {@code "username": "size must be between 3 and 50"}).
     *
     * @param ex исключение со списком ошибок валидации
     * @return {@link ProblemDetail} 400 с картой ошибок по полям
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
     * Резервный обработчик для всех необработанных исключений.
     * Возвращает 500 без раскрытия деталей реализации клиенту.
     *
     * @param ex необработанное исключение
     * @return {@link ProblemDetail} 500 с общим сообщением
     */
    @ExceptionHandler(Exception.class)
    public ProblemDetail handleGeneric(Exception ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred");
        pd.setTitle("Internal Server Error");
        return pd;
    }
}
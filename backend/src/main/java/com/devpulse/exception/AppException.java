package com.devpulse.exception;

import org.springframework.http.HttpStatus;

/**
 * Доменное исключение приложения с привязанным HTTP-статусом.
 *
 * <p>Выбрасывается сервисами в бизнес-ситуациях (например, дублирование
 * пользователя, недействительный токен). Перехватывается {@link GlobalExceptionHandler},
 * который преобразует его в ответ RFC 9457 (Problem Details).
 *
 * <p>Пример использования:
 * <pre>
 * throw new AppException("Username already taken", HttpStatus.CONFLICT);
 * </pre>
 */
public class AppException extends RuntimeException {

    /** HTTP-статус, возвращаемый клиенту в ответе на ошибку. */
    private final HttpStatus status;

    /**
     * Создаёт исключение с сообщением и HTTP-статусом.
     *
     * @param message текст ошибки, возвращаемый в поле {@code detail} ответа
     * @param status  HTTP-статус ответа (например, 409 CONFLICT, 401 UNAUTHORIZED)
     */
    public AppException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }

    /**
     * Возвращает HTTP-статус, связанный с этим исключением.
     *
     * @return HTTP-статус
     */
    public HttpStatus getStatus() {
        return status;
    }
}
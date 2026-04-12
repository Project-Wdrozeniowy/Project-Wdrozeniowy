package com.devpulse.auth.controller;

import com.orbit.auth.dto.AuthRequest;
import com.orbit.auth.dto.AuthResponse;
import com.orbit.auth.dto.RefreshRequest;
import com.orbit.auth.dto.RegisterRequest;
import com.orbit.auth.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/**
 * REST-контроллер, обрабатывающий эндпоинты аутентификации.
 *
 * <p>Все эндпоинты этого контроллера публичны (конфигурация
 * в {@link com.orbit.config.SecurityConfig}).
 *
 * <p>Доступные маршруты:
 * <ul>
 *   <li>{@code POST /auth/register} — регистрация нового аккаунта</li>
 *   <li>{@code POST /auth/login}    — вход в систему, возвращает пару токенов</li>
 *   <li>{@code POST /auth/refresh}  — обновление access token</li>
 * </ul>
 */
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * Регистрирует нового пользователя.
     *
     * @param request валидированные данные регистрации
     * @return {@link AuthResponse} с access и refresh токенами; HTTP 201
     */
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    /**
     * Выполняет вход пользователя и возвращает пару JWT-токенов.
     *
     * @param request данные входа (username, password)
     * @return {@link AuthResponse} с access и refresh токенами; HTTP 200
     */
    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody AuthRequest request) {
        return authService.login(request);
    }

    /**
     * Обновляет access token на основе действующего refresh token.
     *
     * @param request объект, содержащий refresh token
     * @return {@link AuthResponse} с новым access token; HTTP 200
     */
    @PostMapping("/refresh")
    public AuthResponse refresh(@Valid @RequestBody RefreshRequest request) {
        return authService.refresh(request.getRefreshToken());
    }
}

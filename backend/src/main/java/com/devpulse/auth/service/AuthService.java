package com.devpulse.auth.service;

import com.orbit.auth.dto.AuthRequest;
import com.orbit.auth.dto.AuthResponse;
import com.orbit.auth.dto.RegisterRequest;
import com.orbit.auth.entity.RefreshToken;
import com.orbit.auth.entity.User;
import com.orbit.auth.repository.RefreshTokenRepository;
import com.orbit.auth.repository.UserRepository;
import com.orbit.exception.AppException;
import com.orbit.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

/**
 * Сервис, отвечающий за регистрацию, вход и обновление JWT-токенов.
 *
 * <p>Схема аутентификации:
 * <pre>
 * Регистрация:  RegisterRequest → проверка уникальности → BCrypt хэш → сохранение User → токены
 * Вход:         AuthRequest → AuthenticationManager → аннулирование старых refresh → токены
 * Обновление:   refresh token → поиск в БД → проверка срока → новый access token
 * </pre>
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    /** Используется для проверки пароля при входе. */
    private final AuthenticationManager authenticationManager;

    /** Используется для загрузки UserDetails при генерации токена. */
    private final UserDetailsService userDetailsService;

    /** Время жизни access token (с), по умолчанию 900 с = 15 минут. */
    @Value("${jwt.access-expiry:900}")
    private long accessExpirySeconds;

    /** Время жизни refresh token (с), по умолчанию 604800 с = 7 дней. */
    @Value("${jwt.refresh-expiry:604800}")
    private long refreshExpirySeconds;

    /**
     * Регистрирует нового пользователя и возвращает пару токенов.
     *
     * @param request данные регистрации (username, email, password)
     * @return {@link AuthResponse} с access и refresh токенами
     * @throws AppException HTTP 409 если username или email уже занят
     */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new AppException("Username already taken", HttpStatus.CONFLICT);
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new AppException("Email already registered", HttpStatus.CONFLICT);
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .build();
        userRepository.save(user);

        return buildAuthResponse(user);
    }

    /**
     * Выполняет вход пользователя и возвращает пару токенов.
     *
     * <p>Перед генерацией новых токенов аннулирует все предыдущие refresh токены
     * пользователя (стратегия «один активный refresh token»).
     *
     * @param request данные входа (username, password)
     * @return {@link AuthResponse} с access и refresh токенами
     * @throws org.springframework.security.core.AuthenticationException если данные некорректны
     */
    @Transactional
    public AuthResponse login(AuthRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));

        refreshTokenRepository.deleteAllByUser(user);

        return buildAuthResponse(user);
    }

    /**
     * Обновляет access token на основе действующего refresh token.
     *
     * <p>Refresh token остаётся прежним — при обновлении не ротируется.
     * Истёкший refresh token удаляется из базы.
     *
     * @param rawRefreshToken значение refresh token из запроса клиента
     * @return {@link AuthResponse} с новым access token и тем же refresh token
     * @throws AppException HTTP 401 если токен не найден или истёк
     */
    @Transactional
    public AuthResponse refresh(String rawRefreshToken) {
        RefreshToken stored = refreshTokenRepository.findByToken(rawRefreshToken)
                .orElseThrow(() -> new AppException("Refresh token not found", HttpStatus.UNAUTHORIZED));

        if (stored.isExpired()) {
            refreshTokenRepository.delete(stored);
            throw new AppException("Refresh token expired", HttpStatus.UNAUTHORIZED);
        }

        User user = stored.getUser();
        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getUsername());
        String newAccessToken = jwtUtil.generateAccessToken(userDetails);

        return AuthResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(rawRefreshToken)
                .expiresIn(accessExpirySeconds)
                .build();
    }

    /**
     * Вспомогательный метод, создающий новую пару токенов (access + refresh) для пользователя.
     * Сохраняет refresh token в базе данных.
     *
     * @param user сущность пользователя
     * @return {@link AuthResponse}, готовый к отправке клиенту
     */
    private AuthResponse buildAuthResponse(User user) {
        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getUsername());
        String accessToken = jwtUtil.generateAccessToken(userDetails);
        String rawRefresh = jwtUtil.generateRefreshToken();

        refreshTokenRepository.save(RefreshToken.builder()
                .user(user)
                .token(rawRefresh)
                .expiresAt(OffsetDateTime.now().plusSeconds(refreshExpirySeconds))
                .build());

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(rawRefresh)
                .expiresIn(accessExpirySeconds)
                .build();
    }
}

package com.devpulse.auth.filter;

import com.orbit.security.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * HTTP-фильтр, выполняемый один раз за запрос, отвечающий за JWT-аутентификацию.
 *
 * <p>Логика работы:
 * <ol>
 *   <li>Считывает заголовок {@code Authorization: Bearer <token>}.</li>
 *   <li>Если заголовок отсутствует или не начинается с {@code "Bearer "},
 *       запрос пропускается дальше без аутентификации.</li>
 *   <li>Извлекает имя пользователя из токена через {@link JwtUtil#extractUsername}.</li>
 *   <li>Если пользователь ещё не аутентифицирован в текущем контексте,
 *       загружает его данные из базы и верифицирует токен.</li>
 *   <li>После успешной верификации устанавливает {@link UsernamePasswordAuthenticationToken}
 *       в {@link SecurityContextHolder} — Spring Security считает запрос аутентифицированным.</li>
 * </ol>
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    /** Утилита для валидации и парсинга JWT-токенов. */
    private final JwtUtil jwtUtil;

    /** Сервис для загрузки данных пользователя из базы данных. */
    private final UserDetailsService userDetailsService;

    /**
     * Основная логика фильтра — выполняется для каждого входящего HTTP-запроса.
     *
     * @param request     текущий HTTP-запрос
     * @param response    текущий HTTP-ответ
     * @param filterChain цепочка фильтров — вызов {@code doFilter} передаёт запрос дальше
     * @throws ServletException при ошибке фильтрации
     * @throws IOException      при ошибке ввода/вывода
     */
    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        final String jwt = authHeader.substring(7);
        final String username;
        try {
            username = jwtUtil.extractUsername(jwt);
        } catch (Exception e) {
            filterChain.doFilter(request, response);
            return;
        }

        if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);

            if (jwtUtil.isTokenValid(jwt, userDetails)) {
                UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(
                                userDetails, null, userDetails.getAuthorities());
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }

        filterChain.doFilter(request, response);
    }
}

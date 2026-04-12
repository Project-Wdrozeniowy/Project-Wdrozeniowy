package com.devpulse.auth.service;

import com.orbit.auth.entity.User;
import com.orbit.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Реализация {@link UserDetailsService}, загружающая пользователя из базы данных.
 *
 * <p>Spring Security вызывает этот метод в двух местах:
 * <ul>
 *   <li>{@link com.orbit.auth.filter.JwtAuthenticationFilter} —
 *       после декодирования имени пользователя из JWT.</li>
 *   <li>{@link com.orbit.config.SecurityConfig#authenticationProvider()} —
 *       при проверке пароля во время входа.</li>
 * </ul>
 *
 * <p>Сознательно <b>не</b> реализуем {@link UserDetails} непосредственно на сущности {@link User},
 * чтобы разделить доменный слой и механизмы Spring Security.
 */
@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    /**
     * Загружает пользователя из базы данных и оборачивает его в {@link UserDetails}.
     *
     * <p>Роль пользователя маппится на авторитет Spring Security
     * в формате {@code "ROLE_USER"} / {@code "ROLE_ADMIN"}.
     *
     * @param username имя пользователя
     * @return объект {@link UserDetails} с данными пользователя
     * @throws UsernameNotFoundException если пользователь не существует в базе
     */
    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        return new org.springframework.security.core.userdetails.User(
                user.getUsername(),
                user.getPasswordHash(),
                List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
        );
    }
}

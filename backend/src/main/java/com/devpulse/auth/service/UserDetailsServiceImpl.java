package com.devpulse.auth.service;

import com.devpulse.auth.entity.User;
import com.devpulse.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Implementation of {@link UserDetailsService} that loads users from the database.
 *
 * <p>Spring Security calls this method in two places:
 * <ul>
 *   <li>{@link com.devpulse.auth.filter.JwtAuthenticationFilter} —
 *       after decoding the username from a JWT.</li>
 *   <li>{@link com.devpulse.config.SecurityConfig#authenticationProvider()} —
 *       when verifying the password during login.</li>
 * </ul>
 *
 * <p>Intentionally <b>not</b> implementing {@link UserDetails} directly on the {@link User} entity
 * in order to keep the domain layer separate from Spring Security internals.
 */
@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    /**
     * Loads a user from the database and wraps them in a {@link UserDetails} object.
     *
     * <p>The user's role is mapped to a Spring Security authority
     * in the format {@code "ROLE_USER"} / {@code "ROLE_ADMIN"}.
     *
     * @param username the username to look up
     * @return a {@link UserDetails} object containing the user's data
     * @throws UsernameNotFoundException if the user does not exist in the database
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

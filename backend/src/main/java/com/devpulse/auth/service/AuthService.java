package com.devpulse.auth.service;

import com.devpulse.auth.dto.AuthRequest;
import com.devpulse.auth.dto.RegisterRequest;
import com.devpulse.auth.entity.User;
import com.devpulse.auth.entity.UserStatus;
import com.devpulse.auth.repository.UserRepository;
import com.devpulse.auth.session.SessionLifecycle;
import com.devpulse.exception.AppException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Credential verification and account creation; Spring owns the reusable session lifecycle. */
@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final AuthenticationManager authenticationManager;
    private final SessionLifecycle sessions;
    private final jakarta.persistence.EntityManager entityManager;

    @Transactional
    public void register(RegisterRequest input, HttpServletRequest request, HttpServletResponse response) {
        if (users.existsByUsername(input.getUsername())) {
            throw new AppException("Username already taken", HttpStatus.CONFLICT);
        }
        if (users.existsByEmail(input.getEmail())) {
            throw new AppException("Email already registered", HttpStatus.CONFLICT);
        }
        var user = users.saveAndFlush(User.builder().username(input.getUsername()).email(input.getEmail())
                .passwordHash(passwords.encode(input.getPassword())).displayName(input.getDisplayName()).build());
        sessions.establish(user, request, response);
    }

    @Transactional
    public void login(AuthRequest input, HttpServletRequest request, HttpServletResponse response) {
        // The same row lock protects password change. Never publish a session from an old password check.
        var user = users.lockByUsername(input.getUsername())
                .orElseThrow(() -> new BadCredentialsException("Authentication failed"));
        // A request-scoped persistence context may already have loaded this account before the lock.
        entityManager.refresh(user);
        authenticationManager.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(input.getUsername(), input.getPassword()));
        if (user.getStatus() != UserStatus.ACTIVE) throw new BadCredentialsException("Authentication failed");
        sessions.establish(user, request, response);
    }
}

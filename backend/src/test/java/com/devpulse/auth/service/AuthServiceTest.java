package com.devpulse.auth.service;

import com.devpulse.auth.dto.AuthRequest;
import com.devpulse.auth.dto.RegisterRequest;
import com.devpulse.auth.entity.User;
import com.devpulse.auth.entity.UserStatus;
import com.devpulse.auth.repository.UserRepository;
import com.devpulse.auth.session.SessionLifecycle;
import com.devpulse.exception.AppException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.any;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {
    @Mock UserRepository users;
    @Mock PasswordEncoder passwords;
    @Mock AuthenticationManager authenticationManager;
    @Mock SessionLifecycle sessions;
    @Mock jakarta.persistence.EntityManager entityManager;
    @InjectMocks AuthService service;
    MockHttpServletRequest request = new MockHttpServletRequest();
    MockHttpServletResponse response = new MockHttpServletResponse();
    User user;

    @BeforeEach void setUp() {
        user = User.builder().id(1L).username("alice").email("alice@example.test").passwordHash("hash").build();
    }

    @Test void registrationHashesThePasswordAndEstablishesTheSavedIdentity() {
        var input = registration();
        input.setDisplayName("Alice");
        when(passwords.encode("password123")).thenReturn("hash");
        when(users.saveAndFlush(any())).thenAnswer(call -> {
            User saved = call.getArgument(0);
            assertThat(saved.getPasswordHash()).isEqualTo("hash");
            assertThat(saved.getDisplayName()).isEqualTo("Alice");
            return user;
        });
        service.register(input, request, response);
        verify(sessions).establish(user, request, response);
    }

    @Test void registrationWithoutADisplayNameDoesNotInventOne() {
        when(users.saveAndFlush(any())).thenAnswer(call -> {
            User saved = call.getArgument(0);
            assertThat(saved.getDisplayName()).isNull();
            return user;
        });
        service.register(registration(), request, response);
    }

    @Test void duplicateUsernameDoesNotCreateAnAccountOrSession() {
        when(users.existsByUsername("alice")).thenReturn(true);
        assertThatThrownBy(() -> service.register(registration(), request, response)).isInstanceOf(AppException.class);
        verify(users, never()).saveAndFlush(any());
        verifyNoInteractions(sessions);
    }

    @Test void duplicateEmailDoesNotCreateAnAccountOrSession() {
        when(users.existsByEmail("alice@example.test")).thenReturn(true);
        assertThatThrownBy(() -> service.register(registration(), request, response)).isInstanceOf(AppException.class);
        verifyNoInteractions(sessions);
    }

    @Test void loginChecksCredentialsWhileHoldingTheUserLockAndDoesNotRevokeOtherDevices() {
        when(users.lockByUsername("alice")).thenReturn(Optional.of(user));
        service.login(login(), request, response);
        var order = inOrder(users, entityManager, authenticationManager, sessions);
        order.verify(users).lockByUsername("alice");
        order.verify(entityManager).refresh(user);
        order.verify(authenticationManager).authenticate(any());
        order.verify(sessions).establish(user, request, response);
        verify(sessions, never()).logout(any(), any());
    }

    @Test void badCredentialsNeverEstablishASession() {
        when(users.lockByUsername("alice")).thenReturn(Optional.of(user));
        when(authenticationManager.authenticate(any())).thenThrow(new BadCredentialsException("bad"));
        assertThatThrownBy(() -> service.login(login(), request, response)).isInstanceOf(BadCredentialsException.class);
        verifyNoInteractions(sessions);
    }

    @Test void unknownUserNeverEstablishesASession() {
        assertThatThrownBy(() -> service.login(login(), request, response)).isInstanceOf(BadCredentialsException.class);
        verifyNoInteractions(sessions);
    }

    @Test void disabledAccountCannotEstablishASession() {
        user.setStatus(UserStatus.DEACTIVATED);
        when(users.lockByUsername("alice")).thenReturn(Optional.of(user));
        assertThatThrownBy(() -> service.login(login(), request, response)).isInstanceOf(BadCredentialsException.class);
        verifyNoInteractions(sessions);
    }

    private AuthRequest login() {
        var input = new AuthRequest(); input.setUsername("alice"); input.setPassword("password123"); return input;
    }
    private RegisterRequest registration() {
        var input = new RegisterRequest(); input.setUsername("alice"); input.setEmail("alice@example.test");
        input.setPassword("password123"); return input;
    }
}

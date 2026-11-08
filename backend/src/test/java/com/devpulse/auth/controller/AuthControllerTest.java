package com.devpulse.auth.controller;

import com.devpulse.auth.service.AuthService;
import com.devpulse.auth.session.SessionLifecycle;
import com.devpulse.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.any;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** MVC payload/status tests; the real session/CSRF filter boundary has separate integration coverage. */
class AuthControllerTest {
    AuthService auth = mock(AuthService.class);
    SessionLifecycle sessions = mock(SessionLifecycle.class);
    MockMvc mvc;
    @BeforeEach void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(new AuthController(auth, sessions))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
    }
    @Test void loginReturns204WithoutATokenPayload() throws Exception {
        mvc.perform(post("/auth/login").contentType("application/json")
                .content("{\"username\":\"alice\",\"password\":\"password123\"}"))
                .andExpect(status().isNoContent()).andExpect(content().string(""));
        verify(auth).login(any(), any(), any());
    }
    @Test void registerReturns201WithoutATokenPayload() throws Exception {
        mvc.perform(post("/auth/register").contentType("application/json")
                .content("{\"username\":\"alice\",\"email\":\"alice@example.test\",\"password\":\"password123\"}"))
                .andExpect(status().isCreated()).andExpect(content().string(""));
        verify(auth).register(any(), any(), any());
    }
    @ParameterizedTest
    @ValueSource(strings={"{}", "{\"username\":\"\",\"password\":\"p\"}", "{\"username\":\"alice\"}"})
    void malformedCredentialsNeverReachAuthentication(String body) throws Exception {
        mvc.perform(post("/auth/login").contentType("application/json").content(body)).andExpect(status().isBadRequest());
        verifyNoInteractions(auth);
    }
    @ParameterizedTest
    @ValueSource(strings={"{}", "{\"username\":\"alice\",\"email\":\"bad\",\"password\":\"password123\"}",
            "{\"username\":\"alice\",\"email\":\"a@example.test\",\"password\":\"short\"}"})
    void invalidRegistrationDoesNotCreateAnAccount(String body) throws Exception {
        mvc.perform(post("/auth/register").contentType("application/json").content(body)).andExpect(status().isBadRequest());
        verifyNoInteractions(auth);
    }
    @Test void logoutInvokesTheSharedLifecycle() throws Exception {
        mvc.perform(post("/auth/logout")).andExpect(status().isNoContent());
        verify(sessions).logout(any(), any());
    }
    @Test void refreshIsNoLongerAnOperation() throws Exception {
        mvc.perform(post("/auth/refresh")).andExpect(status().isNotFound());
    }
}

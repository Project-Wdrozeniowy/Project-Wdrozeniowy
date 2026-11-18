package com.devpulse.user.controller;

import com.devpulse.auth.entity.Role;
import com.devpulse.auth.entity.User;
import com.devpulse.auth.entity.UserStatus;
import com.devpulse.auth.repository.UserRepository;
import com.devpulse.support.MigratedSchemaTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.aMapWithSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * {@code PATCH /users/me} through the full security filter chain, against the
 * real schema: the error bodies the profile form relies on (PWDRZ-148).
 */
@MigratedSchemaTest
@Transactional
class UserProfileApiTest {

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;

    private final String run = UUID.randomUUID().toString().substring(0, 8);

    private MockMvc mockMvc;
    private User alice;
    private User bob;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).defaultRequest(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/").with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf())).apply(springSecurity()).build();
        alice = saveUser("alice");
        bob = saveUser("bob");
    }

    @Test
    void aBlankEmailIsRejectedAndKeepsTheAddress() throws Exception {
        patchAsAlice("{\"email\":\"\"}")
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value("Validation failed"))
                .andExpect(jsonPath("$.errors", aMapWithSize(1)))
                .andExpect(jsonPath("$.errors.email").value("Email must not be blank"));

        assertThat(emailOf(alice)).isEqualTo(alice.getEmail());
    }

    @Test
    void anEmailOfAnotherAccountIsAConflictOnTheEmailField() throws Exception {
        patchAsAlice("{\"email\":\"" + bob.getEmail() + "\",\"bio\":\"Hello\"}")
                .andExpect(status().isConflict())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value("Email already registered"))
                .andExpect(jsonPath("$.errors", aMapWithSize(1)))
                .andExpect(jsonPath("$.errors.email").value("Email is already used by another account"));

        assertThat(emailOf(alice)).isEqualTo(alice.getEmail());
    }

    @Test
    void validationMessagesNameTheFieldAndItsLimit() throws Exception {
        String longEmail = "a@" + "b".repeat(60) + "." + "c".repeat(40) + ".com";
        patchAsAlice("""
                {"email":"%s","displayName":"%s","avatarUrl":"ftp://files.example.com/a.png","bio":"%s"}
                """.formatted(longEmail, "d".repeat(101), "e".repeat(1001)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors", aMapWithSize(4)))
                .andExpect(jsonPath("$.errors.email").value("Email must be at most 100 characters"))
                .andExpect(jsonPath("$.errors.displayName").value("Display name must be at most 100 characters"))
                .andExpect(jsonPath("$.errors.avatarUrl").value("Avatar URL must be a valid http or https URL"))
                .andExpect(jsonPath("$.errors.bio").value("Bio must be at most 1000 characters"));
    }

    @Test
    void theCallersOwnEmailIsNotAConflict() throws Exception {
        patchAsAlice("{\"email\":\"" + alice.getEmail() + "\",\"displayName\":\"Alice\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(alice.getEmail()))
                .andExpect(jsonPath("$.displayName").value("Alice"));
    }

    private ResultActions patchAsAlice(String body) throws Exception {
        return mockMvc.perform(patch("/users/me")
                .with(user(alice.getUsername()).roles(Role.USER.name()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    private String emailOf(User user) {
        return userRepository.findById(user.getId()).orElseThrow().getEmail();
    }

    private User saveUser(String name) {
        String username = name + "-" + run;
        return userRepository.save(User.builder()
                .username(username)
                .email(username + "@example.com")
                .passwordHash("hash")
                .role(Role.USER)
                .status(UserStatus.ACTIVE)
                .build());
    }
}

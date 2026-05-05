package com.devpulse.auth.service;

import com.devpulse.auth.entity.Role;
import com.devpulse.auth.entity.User;
import com.devpulse.auth.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserDetailsServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserDetailsServiceImpl userDetailsService;

    @Test
    void loadUserByUsername_returnsCorrectUsernameAndPassword() {
        User user = User.builder()
                .id(1L)
                .username("alice")
                .email("alice@example.com")
                .passwordHash("bcrypt-hash")
                .role(Role.USER)
                .build();
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));

        UserDetails details = userDetailsService.loadUserByUsername("alice");

        assertThat(details.getUsername()).isEqualTo("alice");
        assertThat(details.getPassword()).isEqualTo("bcrypt-hash");
    }

    @Test
    void loadUserByUsername_userRole_mapsToRoleUserAuthority() {
        User user = User.builder()
                .username("alice")
                .passwordHash("hashed")
                .role(Role.USER)
                .build();
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));

        UserDetails details = userDetailsService.loadUserByUsername("alice");

        assertThat(details.getAuthorities())
                .extracting(GrantedAuthority::getAuthority)
                .containsExactly("ROLE_USER");
    }

    @Test
    void loadUserByUsername_adminRole_mapsToRoleAdminAuthority() {
        User user = User.builder()
                .username("admin")
                .passwordHash("hashed")
                .role(Role.ADMIN)
                .build();
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(user));

        UserDetails details = userDetailsService.loadUserByUsername("admin");

        assertThat(details.getAuthorities())
                .extracting(GrantedAuthority::getAuthority)
                .containsExactly("ROLE_ADMIN");
    }

    @Test
    void loadUserByUsername_unknownUser_throwsUsernameNotFoundException() {
        when(userRepository.findByUsername("ghost")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userDetailsService.loadUserByUsername("ghost"))
                .isInstanceOf(UsernameNotFoundException.class)
                .hasMessageContaining("ghost");
    }
}

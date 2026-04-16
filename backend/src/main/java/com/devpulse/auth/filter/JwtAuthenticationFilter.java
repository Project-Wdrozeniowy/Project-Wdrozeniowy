package com.devpulse.auth.filter;

import com.devpulse.security.JwtUtil;
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
 * HTTP filter executed once per request, responsible for JWT authentication.
 *
 * <p>Processing logic:
 * <ol>
 *   <li>Reads the {@code Authorization: Bearer <token>} header.</li>
 *   <li>If the header is absent or does not start with {@code "Bearer "},
 *       the request is passed through without authentication.</li>
 *   <li>Extracts the username from the token via {@link JwtUtil#extractUsername}.</li>
 *   <li>If the user is not yet authenticated in the current context,
 *       loads their details from the database and verifies the token.</li>
 *   <li>On successful verification, sets a {@link UsernamePasswordAuthenticationToken}
 *       in the {@link SecurityContextHolder} — Spring Security treats the request as authenticated.</li>
 * </ol>
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    /** Utility for validating and parsing JWT tokens. */
    private final JwtUtil jwtUtil;

    /** Service for loading user data from the database. */
    private final UserDetailsService userDetailsService;

    /**
     * Core filter logic — executed for every incoming HTTP request.
     *
     * @param request     the current HTTP request
     * @param response    the current HTTP response
     * @param filterChain the filter chain — calling {@code doFilter} passes the request along
     * @throws ServletException on a filter error
     * @throws IOException      on an I/O error
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

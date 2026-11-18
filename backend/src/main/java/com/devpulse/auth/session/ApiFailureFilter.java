package com.devpulse.auth.session;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.net.URI;

/** Includes session load/commit failures, which occur outside MVC exception advice. */
@Component
@Order(Integer.MIN_VALUE + 10)
public class ApiFailureFilter extends OncePerRequestFilter {
    private final ObjectMapper mapper = new ObjectMapper()
            .setSerializationInclusion(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL);
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        try {
            chain.doFilter(request, response);
        } catch (RuntimeException | ServletException failure) {
            if (response.isCommitted()) throw new IOException("API response interrupted");
            Throwable cause = failure;
            while (cause.getCause() != null && !(cause instanceof DataAccessException)) cause = cause.getCause();
            var status = cause instanceof DataAccessException ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.INTERNAL_SERVER_ERROR;
            var problem = ProblemDetail.forStatusAndDetail(status,
                    status == HttpStatus.SERVICE_UNAVAILABLE ? "Session service unavailable" : "An unexpected error occurred");
            problem.setTitle(status.getReasonPhrase());
            problem.setInstance(URI.create(request.getRequestURI()));
            response.resetBuffer();
            response.setStatus(status.value());
            response.setContentType("application/problem+json");
            response.setHeader("Cache-Control", "no-store");
            mapper.writeValue(response.getOutputStream(), problem);
        }
    }
}

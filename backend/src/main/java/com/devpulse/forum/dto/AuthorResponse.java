package com.devpulse.forum.dto;

import com.devpulse.auth.entity.User;

public record AuthorResponse(Long id, String username) {

    public static AuthorResponse from(User user) {
        return new AuthorResponse(user.getId(), user.getUsername());
    }
}

package com.devpulse.forum.controller;

import com.devpulse.forum.dto.CommentResponse;
import com.devpulse.forum.dto.CreateCommentRequest;
import com.devpulse.forum.service.CommentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/forum")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    @GetMapping("/posts/{postId}/comments")
    public Page<CommentResponse> getComments(
            @PathVariable Long postId,
            @PageableDefault(size = 20) Pageable pageable) {
        return commentService.getComments(postId, pageable);
    }

    @PostMapping("/posts/{postId}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("isAuthenticated()")
    public CommentResponse addComment(
            @PathVariable Long postId,
            @Valid @RequestBody CreateCommentRequest request,
            Principal principal) {
        return commentService.addComment(postId, request, principal.getName());
    }

    @DeleteMapping("/comments/{commentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("isAuthenticated()")
    public void deleteComment(
            @PathVariable Long commentId,
            Principal principal) {
        commentService.deleteComment(commentId, principal.getName());
    }
}

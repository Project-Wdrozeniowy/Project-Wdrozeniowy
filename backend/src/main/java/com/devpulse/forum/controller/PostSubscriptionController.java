package com.devpulse.forum.controller;

import com.devpulse.common.dto.PagedResponse;
import com.devpulse.forum.dto.PostSummaryDto;
import com.devpulse.forum.service.PostSubscriptionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller for subscriptions to post threads; the rules are documented
 * on {@link PostSubscriptionService}. Every operation requires authentication.
 *
 * <p>The subscription is a sub-resource of the post addressed by slug, like
 * the other post routes; it replaces the {@code /api/posts/{id}/subscribe}
 * path of the early design.
 */
@Tag(name = "Forum – Subscriptions", description = "Subscribe to new comments on posts")
@RestController
@RequiredArgsConstructor
public class PostSubscriptionController {

    private final PostSubscriptionService subscriptionService;

    /** Subscribes the caller to the post. */
    @Operation(summary = "Subscribe to a post",
            description = "Idempotent: subscribing again changes nothing.",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Subscribed"),
        @ApiResponse(responseCode = "401", description = "Not authenticated"),
        @ApiResponse(responseCode = "404", description = "Not found, deleted, or a draft the caller may not see")
    })
    @PutMapping("/forum/posts/{slug}/subscription")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void subscribe(
            @Parameter(description = "Post slug", example = "how-to-use-spring-boot-with-postgresql")
            @PathVariable String slug) {
        subscriptionService.subscribe(slug);
    }

    /** Unsubscribes the caller from the post. */
    @Operation(summary = "Unsubscribe from a post",
            description = "Idempotent: unsubscribing without a subscription changes nothing.",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Not subscribed any more"),
        @ApiResponse(responseCode = "401", description = "Not authenticated"),
        @ApiResponse(responseCode = "404", description = "Not found, deleted, or a draft the caller may not see")
    })
    @DeleteMapping("/forum/posts/{slug}/subscription")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unsubscribe(
            @Parameter(description = "Post slug", example = "how-to-use-spring-boot-with-postgresql")
            @PathVariable String slug) {
        subscriptionService.unsubscribe(slug);
    }

    /** Lists the posts the caller is subscribed to. */
    @Operation(summary = "List my post subscriptions",
            description = "Posts the caller is subscribed to and can still read, most recent subscription first.",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Subscriptions returned"),
        @ApiResponse(responseCode = "400", description = "Invalid pagination"),
        @ApiResponse(responseCode = "401", description = "Not authenticated")
    })
    @GetMapping("/users/me/subscriptions")
    public PagedResponse<PostSummaryDto> mySubscriptions(
            @Parameter(description = "Page number (0-based)", example = "0") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size, 1 to 50", example = "20") @RequestParam(defaultValue = "20") int size) {
        return subscriptionService.mySubscriptions(page, size);
    }
}

package com.devpulse.notification.controller;

import com.devpulse.common.dto.PagedResponse;
import com.devpulse.notification.dto.NotificationDto;
import com.devpulse.notification.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for the caller's notifications; the rules are documented on
 * {@link NotificationService}. Every operation requires authentication.
 */
@Tag(name = "Notifications", description = "Manage user notifications")
@RestController
@RequestMapping("/notifications")
@SecurityRequirement(name = "sessionAuth")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    /** Lists the caller's notifications, newest first. */
    @Operation(summary = "List notifications for the authenticated user",
            description = "Newest first. With unreadOnly=true only unread notifications are listed; "
                    + "totalElements is then the unread count.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Notifications returned"),
        @ApiResponse(responseCode = "400", description = "Invalid pagination"),
        @ApiResponse(responseCode = "401", description = "Not authenticated")
    })
    @GetMapping
    public PagedResponse<NotificationDto> listNotifications(
            @Parameter(description = "Page number (0-based)", example = "0") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size, 1 to 50", example = "20") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Only unread notifications") @RequestParam(defaultValue = "false") boolean unreadOnly) {
        return notificationService.list(page, size, unreadOnly);
    }

    /** Marks one of the caller's notifications as read. */
    @Operation(summary = "Mark a notification as read", description = "Idempotent.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Notification marked as read"),
        @ApiResponse(responseCode = "401", description = "Not authenticated"),
        @ApiResponse(responseCode = "403", description = "Not the recipient"),
        @ApiResponse(responseCode = "404", description = "Not found")
    })
    @PatchMapping("/{id}/read")
    public NotificationDto markRead(
            @Parameter(description = "Notification ID", example = "200") @PathVariable Long id) {
        return notificationService.markRead(id);
    }

    /** Marks all of the caller's notifications as read. */
    @Operation(summary = "Mark all notifications as read")
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "All notifications marked as read"),
        @ApiResponse(responseCode = "401", description = "Not authenticated")
    })
    @PatchMapping("/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markAllRead() {
        notificationService.markAllRead();
    }

    /** Deletes one of the caller's notifications. */
    @Operation(summary = "Delete a notification")
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Notification deleted"),
        @ApiResponse(responseCode = "401", description = "Not authenticated"),
        @ApiResponse(responseCode = "403", description = "Not the recipient"),
        @ApiResponse(responseCode = "404", description = "Not found")
    })
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteNotification(
            @Parameter(description = "Notification ID", example = "200") @PathVariable Long id) {
        notificationService.delete(id);
    }
}

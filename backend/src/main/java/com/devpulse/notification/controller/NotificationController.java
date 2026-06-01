package com.devpulse.notification.controller;

import com.devpulse.common.dto.PagedResponse;
import com.devpulse.notification.dto.NotificationDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@Tag(name = "Notifications", description = "Manage user notifications")
@RestController
@RequestMapping("/notifications")
@SecurityRequirement(name = "bearerAuth")
public class NotificationController {

    @Operation(summary = "List notifications for the authenticated user")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Notifications returned"),
        @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    @GetMapping
    public PagedResponse<NotificationDto> listNotifications(
            @Parameter(description = "Page number (0-based)", example = "0") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size", example = "20") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Filter by read status") @RequestParam(required = false) Boolean unreadOnly) {
        throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED);
    }

    @Operation(summary = "Mark a notification as read")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Notification marked as read"),
        @ApiResponse(responseCode = "403", description = "Not the recipient"),
        @ApiResponse(responseCode = "404", description = "Not found")
    })
    @PatchMapping("/{id}/read")
    public NotificationDto markRead(
            @Parameter(description = "Notification ID", example = "200") @PathVariable Long id) {
        throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED);
    }

    @Operation(summary = "Mark all notifications as read")
    @ApiResponse(responseCode = "204", description = "All notifications marked as read")
    @PatchMapping("/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markAllRead() {
        throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED);
    }

    @Operation(summary = "Delete a notification")
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Notification deleted"),
        @ApiResponse(responseCode = "403", description = "Not the recipient"),
        @ApiResponse(responseCode = "404", description = "Not found")
    })
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteNotification(
            @Parameter(description = "Notification ID", example = "200") @PathVariable Long id) {
        throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED);
    }
}

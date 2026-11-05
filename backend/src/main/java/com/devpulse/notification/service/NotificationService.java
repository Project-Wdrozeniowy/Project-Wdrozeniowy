package com.devpulse.notification.service;

import com.devpulse.auth.entity.User;
import com.devpulse.auth.util.AuthenticatedUserResolver;
import com.devpulse.common.dto.PagedResponse;
import com.devpulse.exception.AppException;
import com.devpulse.notification.dto.NotificationDto;
import com.devpulse.notification.entity.Notification;
import com.devpulse.notification.entity.NotificationType;
import com.devpulse.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;

/**
 * The caller's notifications: list, mark read and delete.
 *
 * <p>Every operation works on the caller's own notifications only; another
 * user's notification answers 403. The features that cause notifications
 * decide whom to notify and store them with {@link #send} (comments under
 * PWDRZ-142); real-time delivery is PWDRZ-104.
 */
@Service
@RequiredArgsConstructor
public class NotificationService {

    public static final int MAX_PAGE_SIZE = 50;

    private final NotificationRepository notificationRepository;
    private final AuthenticatedUserResolver currentUser;

    /**
     * Stores one unread notification per recipient. Joins the caller's
     * transaction, so the notifications are kept only if the change that
     * caused them is.
     *
     * @param recipientIds users to notify; nothing is stored when empty
     * @param sender       the user whose action caused the notifications
     * @param entityType   {@code POST} or {@code COMMENT}
     * @param entityId     id of the post or comment the notifications relate to
     */
    @Transactional
    public void send(Collection<Long> recipientIds, User sender, NotificationType type,
                     String entityType, Long entityId, String message) {
        notificationRepository.saveAll(recipientIds.stream()
                .map(recipientId -> Notification.builder()
                        .recipientId(recipientId)
                        .sender(sender)
                        .type(type)
                        .entityType(entityType)
                        .entityId(entityId)
                        .message(message)
                        .build())
                .toList());
    }

    /**
     * The caller's notifications, newest first; only unread ones when {@code unreadOnly}.
     *
     * @throws AppException HTTP 400 if the page or size is out of range
     */
    @Transactional(readOnly = true)
    public PagedResponse<NotificationDto> list(int page, int size, boolean unreadOnly) {
        if (page < 0 || size < 1 || size > MAX_PAGE_SIZE) {
            throw new AppException("page must be >= 0 and size between 1 and " + MAX_PAGE_SIZE,
                    HttpStatus.BAD_REQUEST);
        }
        Long recipientId = currentUser.currentUser().getId();
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")));
        return PagedResponse.from(unreadOnly
                ? notificationRepository.findByRecipientIdAndReadFalse(recipientId, pageable)
                : notificationRepository.findByRecipientId(recipientId, pageable), NotificationDto::from);
    }

    /**
     * Marks one of the caller's notifications as read; marking it again changes nothing.
     *
     * @throws AppException HTTP 404 if it does not exist; HTTP 403 if it belongs to another user
     */
    @Transactional
    public NotificationDto markRead(Long id) {
        Notification notification = ownNotification(id);
        notification.setRead(true);
        return NotificationDto.from(notificationRepository.saveAndFlush(notification));
    }

    /** Marks all of the caller's notifications as read. */
    @Transactional
    public void markAllRead() {
        notificationRepository.markAllRead(currentUser.currentUser().getId());
    }

    /**
     * Deletes one of the caller's notifications.
     *
     * @throws AppException HTTP 404 if it does not exist; HTTP 403 if it belongs to another user
     */
    @Transactional
    public void delete(Long id) {
        notificationRepository.delete(ownNotification(id));
    }

    private Notification ownNotification(Long id) {
        Long callerId = currentUser.currentUser().getId();
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new AppException("Notification not found", HttpStatus.NOT_FOUND));
        if (!notification.getRecipientId().equals(callerId)) {
            throw new AppException("Only the recipient can change a notification", HttpStatus.FORBIDDEN);
        }
        return notification;
    }
}

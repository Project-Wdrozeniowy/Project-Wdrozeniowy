package com.devpulse.notification.service;

import com.devpulse.auth.entity.User;
import com.devpulse.auth.util.AuthenticatedUserResolver;
import com.devpulse.common.dto.PagedResponse;
import com.devpulse.exception.AppException;
import com.devpulse.forum.entity.CommentStatus;
import com.devpulse.forum.repository.CommentDestinationRow;
import com.devpulse.forum.repository.CommentRepository;
import com.devpulse.notification.dto.NotificationDestinationDto;
import com.devpulse.notification.dto.NotificationDestinationDto.UnavailableReason;
import com.devpulse.notification.dto.NotificationDto;
import com.devpulse.notification.entity.Notification;
import com.devpulse.notification.entity.NotificationType;
import com.devpulse.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import static com.devpulse.forum.security.ForumAuthorities.isAdmin;
import static com.devpulse.forum.security.ForumAuthorities.isUser;

/**
 * The caller's notifications: list, mark read and delete.
 *
 * <p>Every operation works on the caller's own notifications only; another
 * user's notification answers 403. The features that cause notifications
 * decide whom to notify and store them with {@link #send} (comments under
 * PWDRZ-142); real-time delivery is PWDRZ-104.
 *
 * <p>{@code COMMENT_ON_POST} and {@code REPLY_TO_COMMENT} notifications relate
 * to a comment and carry the discussion they lead to, checked against what the
 * recipient may read when the notification is read: the post must not be
 * deleted or a draft the recipient may not read, and the comment must still be
 * visible. Otherwise the destination is unavailable and names no post or
 * comment. The comments of a page are resolved in one query.
 */
@Service
@RequiredArgsConstructor
public class NotificationService {

    public static final int MAX_PAGE_SIZE = 50;

    /** {@code entity_type} of a notification about a comment. */
    static final String COMMENT_ENTITY = "COMMENT";

    /** Types that lead to a comment in its discussion. */
    private static final Set<NotificationType> DISCUSSION_TYPES =
            EnumSet.of(NotificationType.COMMENT_ON_POST, NotificationType.REPLY_TO_COMMENT);

    private final NotificationRepository notificationRepository;
    private final CommentRepository commentRepository;
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
        Page<Notification> notifications = unreadOnly
                ? notificationRepository.findByRecipientIdAndReadFalse(recipientId, pageable)
                : notificationRepository.findByRecipientId(recipientId, pageable);
        Map<Long, NotificationDestinationDto> destinations = destinations(notifications.getContent());
        return PagedResponse.from(notifications,
                notification -> NotificationDto.from(notification, destinations.get(notification.getId())));
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
        Notification saved = notificationRepository.saveAndFlush(notification);
        return NotificationDto.from(saved, destinations(List.of(saved)).get(saved.getId()));
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

    /**
     * Destinations of the discussion notifications among {@code notifications}
     * by notification id, for the current caller, with one query; other
     * notifications have none.
     */
    private Map<Long, NotificationDestinationDto> destinations(List<Notification> notifications) {
        List<Notification> discussions = notifications.stream()
                .filter(notification -> DISCUSSION_TYPES.contains(notification.getType())
                        && COMMENT_ENTITY.equals(notification.getEntityType())
                        && notification.getEntityId() != null)
                .toList();
        if (discussions.isEmpty()) {
            return Map.of();
        }
        Map<Long, CommentDestinationRow> comments = commentRepository
                .findDestinations(discussions.stream().map(Notification::getEntityId).distinct().toList())
                .stream()
                .collect(Collectors.toMap(CommentDestinationRow::commentId, Function.identity()));
        Authentication caller = SecurityContextHolder.getContext().getAuthentication();
        Map<Long, NotificationDestinationDto> destinations = new HashMap<>();
        for (Notification notification : discussions) {
            destinations.put(notification.getId(), destination(comments.get(notification.getEntityId()), caller));
        }
        return destinations;
    }

    private static NotificationDestinationDto destination(CommentDestinationRow comment, Authentication caller) {
        if (comment == null) {
            return NotificationDestinationDto.unavailable(UnavailableReason.COMMENT_UNAVAILABLE);
        }
        if (!mayRead(comment, caller)) {
            return NotificationDestinationDto.unavailable(UnavailableReason.POST_UNAVAILABLE);
        }
        if (comment.commentStatus() != CommentStatus.VISIBLE) {
            return NotificationDestinationDto.unavailable(UnavailableReason.COMMENT_UNAVAILABLE);
        }
        return NotificationDestinationDto.at(comment.postSlug(), comment.commentId());
    }

    /** The same rule as reading a post: not deleted, and a draft only for its author and admins. */
    private static boolean mayRead(CommentDestinationRow comment, Authentication caller) {
        return switch (comment.postStatus()) {
            case PUBLISHED, LOCKED -> true;
            case DELETED -> false;
            case DRAFT -> isAdmin(caller) || isUser(caller, comment.postAuthor());
        };
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

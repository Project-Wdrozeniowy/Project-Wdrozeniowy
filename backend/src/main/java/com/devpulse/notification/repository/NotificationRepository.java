package com.devpulse.notification.repository;

import com.devpulse.notification.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * JPA repository for {@link Notification}.
 */
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    @EntityGraph(attributePaths = "sender")
    Page<Notification> findByRecipientId(Long recipientId, Pageable pageable);

    @EntityGraph(attributePaths = "sender")
    Page<Notification> findByRecipientIdAndReadFalse(Long recipientId, Pageable pageable);

    /** Marks every unread notification of the recipient as read; returns how many changed. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("UPDATE Notification n SET n.read = true WHERE n.recipientId = :recipientId AND n.read = false")
    int markAllRead(@Param("recipientId") Long recipientId);
}

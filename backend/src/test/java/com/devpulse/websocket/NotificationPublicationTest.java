package com.devpulse.websocket;

import com.devpulse.notification.service.NotificationPublication;
import com.devpulse.websocket.dto.NotificationCreatedEvent;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.*;
import org.springframework.transaction.event.TransactionalEventListenerFactory;
import org.springframework.transaction.support.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class NotificationPublicationTest {
    @Test void commitPublishesRollbackDoesNotAndDeliveryFailureCannotFailTheCommittedAction() {
        try (var context = new AnnotationConfigApplicationContext()) {
            var connections = mock(NotificationConnections.class);
            context.registerBean(TransactionalEventListenerFactory.class);
            context.registerBean(NotificationPublication.class, () -> new NotificationPublication(connections));
            context.refresh();
            var event = new NotificationPublication.Created(4L, 9L);
            TransactionSynchronizationManager.setActualTransactionActive(true);
            TransactionSynchronizationManager.initSynchronization();
            try {
                context.publishEvent(event);
                verifyNoInteractions(connections);
                TransactionSynchronizationManager.getSynchronizations().forEach(s -> s.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK));
                verifyNoInteractions(connections);
            } finally { TransactionSynchronizationManager.clear(); }
            TransactionSynchronizationManager.setActualTransactionActive(true);
            TransactionSynchronizationManager.initSynchronization();
            try {
                doThrow(new IllegalStateException("private failure")).when(connections).publish(4L, 9L);
                context.publishEvent(event);
                assertThatCode(() -> TransactionSynchronizationManager.getSynchronizations()
                        .forEach(s -> s.afterCompletion(TransactionSynchronization.STATUS_COMMITTED))).doesNotThrowAnyException();
                verify(connections).publish(4L, 9L);
            } finally { TransactionSynchronizationManager.clear(); }
        }
    }
    @Test void eventHasStableIdentityAndNoPrivateContent() throws Exception {
        String json = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(NotificationCreatedEvent.of(9L));
        try (var fixture = getClass().getResourceAsStream("/contracts/notification-created.v1.json")) {
            assertThat(fixture).isNotNull();
            assertThat(json).isEqualTo(new String(fixture.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8).strip());
        }
    }
}

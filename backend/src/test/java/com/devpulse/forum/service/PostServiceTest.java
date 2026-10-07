package com.devpulse.forum.service;

import com.devpulse.forum.dto.CreatePostRequest;
import com.devpulse.forum.dto.PostDto;
import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;

import java.sql.SQLException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for the slug-race retry in {@link PostService#create}. Everything
 * else in the service is covered against PostgreSQL by
 * {@link PostServiceIntegrationTest}.
 */
@ExtendWith(MockitoExtension.class)
class PostServiceTest {

    @Mock private TransactionTemplate transactionTemplate;

    @InjectMocks private PostService postService;

    private final CreatePostRequest request = new CreatePostRequest();
    private final PostDto created = PostDto.builder().slug("hello-world-2").build();

    private static DataIntegrityViolationException violation(String constraint) {
        return new DataIntegrityViolationException("insert failed",
                new ConstraintViolationException("duplicate key", new SQLException(), constraint));
    }

    @Test
    @SuppressWarnings("unchecked")
    void retriesInANewTransactionWhenAConcurrentInsertTookTheSlug() {
        when(transactionTemplate.execute(any(TransactionCallback.class)))
                .thenThrow(violation(PostService.SLUG_CONSTRAINT))
                .thenReturn(created);

        assertThat(postService.create(request)).isSameAs(created);
        verify(transactionTemplate, times(2)).execute(any(TransactionCallback.class));
    }

    @Test
    @SuppressWarnings("unchecked")
    void givesUpAfterRepeatedSlugCollisions() {
        when(transactionTemplate.execute(any(TransactionCallback.class)))
                .thenThrow(violation(PostService.SLUG_CONSTRAINT));

        assertThatThrownBy(() -> postService.create(request))
                .isInstanceOf(DataIntegrityViolationException.class);
        verify(transactionTemplate, times(PostService.MAX_SLUG_ATTEMPTS)).execute(any(TransactionCallback.class));
    }

    @Test
    @SuppressWarnings("unchecked")
    void doesNotRetryOtherConstraintViolations() {
        when(transactionTemplate.execute(any(TransactionCallback.class)))
                .thenThrow(violation("posts_user_id_fkey"));

        assertThatThrownBy(() -> postService.create(request))
                .isInstanceOf(DataIntegrityViolationException.class);
        verify(transactionTemplate, times(1)).execute(any(TransactionCallback.class));
    }
}

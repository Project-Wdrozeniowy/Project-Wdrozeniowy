package com.devpulse.analytics.service;

import com.devpulse.analytics.repository.PostEngagementRepository;
import com.devpulse.auth.entity.User;
import com.devpulse.auth.util.AuthenticatedUserResolver;
import com.devpulse.exception.AppException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.time.OffsetDateTime;
import java.util.Optional;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PostEngagementServiceTest {
    @Mock private PostEngagementRepository repository;
    @Mock private AuthenticatedUserResolver currentUser;
    @InjectMocks private PostEngagementService service;
    private final PostEngagementRepository.Engagement row = new PostEngagementRepository.Engagement(
            101, 3, 2, 2, OffsetDateTime.parse("2026-11-01T00:00:00Z"), 3, 1);

    @Test
    void publicSummaryContainsOnlyPublicCountsWithoutResolvingIdentity() {
        when(repository.publicEngagement(101)).thenReturn(Optional.of(row));
        var result = service.publicSummary(101);
        assertThat(result.postId()).isEqualTo(101);
        assertThat(result.viewCount()).isEqualTo(3);
        assertThat(result.commentCount()).isEqualTo(2);
        assertThat(result.voteScore()).isEqualTo(2);
        assertThat(result.collectedFrom()).isEqualTo(row.collectedFrom());
        verifyNoInteractions(currentUser);
    }

    @Test
    void authorSummaryUsesTheResolvedOwnerAndAddsOnlyTheVoteBreakdown() {
        when(currentUser.currentUser()).thenReturn(User.builder().id(7L).build());
        when(repository.authorEngagement(101, 7)).thenReturn(Optional.of(row));
        var result = service.authorSummary(101);
        assertThat(result.upvoteCount()).isEqualTo(3);
        assertThat(result.downvoteCount()).isEqualTo(1);
        assertThat(result.viewCount()).isEqualTo(3);
        verify(repository).authorEngagement(101, 7);
        verify(repository, never()).publicEngagement(anyLong());
    }

    @Test
    void inaccessiblePublicPostIsNotFound() {
        when(repository.publicEngagement(101)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.publicSummary(101)).isInstanceOf(AppException.class);
    }
}

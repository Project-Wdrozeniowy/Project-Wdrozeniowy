package com.devpulse.analytics.service;

import com.devpulse.analytics.dto.AuthorPostEngagementDto;
import com.devpulse.analytics.dto.PublicPostEngagementDto;
import com.devpulse.analytics.repository.PostEngagementRepository;
import com.devpulse.auth.util.AuthenticatedUserResolver;
import com.devpulse.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Small post-summary boundary; staff analytics remain in AnalyticsService. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PostEngagementService {
    private final PostEngagementRepository repository;
    private final AuthenticatedUserResolver currentUser;

    public PublicPostEngagementDto publicSummary(long postId) {
        var row = repository.publicEngagement(postId)
                .orElseThrow(() -> new AppException("Post not found", HttpStatus.NOT_FOUND));
        return new PublicPostEngagementDto(row.postId(), row.views(), row.comments(), row.score(), row.collectedFrom());
    }

    public AuthorPostEngagementDto authorSummary(long postId) {
        long owner = currentUser.currentUser().getId();
        var row = repository.authorEngagement(postId, owner)
                .orElseThrow(() -> new AppException("Post not found", HttpStatus.NOT_FOUND));
        return new AuthorPostEngagementDto(row.postId(), row.views(), row.comments(), row.score(),
                row.collectedFrom(), row.upvotes(), row.downvotes());
    }
}

package com.devpulse.forum.repository;

import com.devpulse.forum.entity.CommentStatus;
import com.devpulse.forum.entity.PostStatus;

/** Where a comment sits: its status and its post's slug, status and author, for notification destinations. */
public record CommentDestinationRow(Long commentId, CommentStatus commentStatus, String postSlug,
                                    PostStatus postStatus, String postAuthor) {
}

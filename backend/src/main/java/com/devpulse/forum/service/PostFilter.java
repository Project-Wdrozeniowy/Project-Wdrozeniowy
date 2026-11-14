package com.devpulse.forum.service;

import com.devpulse.forum.entity.PostStatus;

import java.time.OffsetDateTime;

/**
 * Optional criteria for listing posts; {@code null} means "no filter".
 *
 * @param q            case-insensitive text matched against title and content
 * @param categoryId   category id
 * @param categorySlug category slug
 * @param tag          tag slug
 * @param author       author username
 * @param status       requested status; only honoured when the caller may see
 *                     posts in that status, see {@link PostService#search}
 * @param createdFrom  earliest creation instant, inclusive
 * @param createdTo    creation instant to stay before, exclusive
 * @param uncategorized {@code true} for posts without a category only
 */
public record PostFilter(String q,
                         Long categoryId,
                         String categorySlug,
                         String tag,
                         String author,
                         PostStatus status,
                         OffsetDateTime createdFrom,
                         OffsetDateTime createdTo,
                         boolean uncategorized) {

    /** Text, category, tag, author and status criteria without creation bounds. */
    public PostFilter(String q, Long categoryId, String categorySlug, String tag, String author, PostStatus status) {
        this(q, categoryId, categorySlug, tag, author, status, null, null, false);
    }
}

package com.devpulse.forum.service;

import com.devpulse.forum.entity.PostStatus;

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
 */
public record PostFilter(String q,
                         Long categoryId,
                         String categorySlug,
                         String tag,
                         String author,
                         PostStatus status) {
}

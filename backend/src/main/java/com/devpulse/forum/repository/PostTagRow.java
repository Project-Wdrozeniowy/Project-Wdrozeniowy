package com.devpulse.forum.repository;

import com.devpulse.forum.entity.Tag;

/** One tag of one post, as loaded for a whole page of posts at once. */
public record PostTagRow(Long postId, Tag tag) {
}

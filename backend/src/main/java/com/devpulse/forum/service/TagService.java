package com.devpulse.forum.service;

import com.devpulse.forum.dto.TagDto;
import com.devpulse.forum.repository.TagRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Read access to tags for everyone, signed in or not.
 *
 * <p>A tag's {@code postCount} counts only publicly visible posts and is kept
 * by {@link PostService}. Tags with no public post are left out: they exist
 * only on drafts or deleted posts, and listing them would reveal what those
 * posts are about. The posts of a tag come from
 * {@code GET /forum/posts?tag={slug}}, which applies the same visibility.
 */
@Service
@RequiredArgsConstructor
public class TagService {

    private final TagRepository tagRepository;

    /** Returns the tags on at least one public post, most used first, then by name. */
    @Transactional(readOnly = true)
    public List<TagDto> listInUse() {
        return tagRepository.findAllInUse().stream()
                .map(TagDto::from)
                .toList();
    }
}

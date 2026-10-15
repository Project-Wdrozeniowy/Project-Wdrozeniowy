package com.devpulse.search.service;

import com.devpulse.auth.entity.UserStatus;
import com.devpulse.auth.repository.UserRepository;
import com.devpulse.common.dto.PagedResponse;
import com.devpulse.common.util.LikePatterns;
import com.devpulse.exception.AppException;
import com.devpulse.forum.dto.TagDto;
import com.devpulse.forum.repository.TagRepository;
import com.devpulse.forum.service.PostFilter;
import com.devpulse.forum.service.PostService;
import com.devpulse.search.dto.SearchResultsDto;
import com.devpulse.search.dto.SearchType;
import com.devpulse.user.dto.UserSummaryDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * One search across posts, users and tags.
 *
 * <ul>
 *   <li>Posts: the public post search ({@link PostService#search}), so only
 *       published and locked posts are found; most recent activity first.</li>
 *   <li>Users: active accounts whose username or display name contains the
 *       query, by username; only public profile fields are returned.</li>
 *   <li>Tags: tags on at least one public post whose name contains the query,
 *       most used first.</li>
 * </ul>
 * Matching is a case-insensitive substring match. Each kind is paged on its
 * own, with an id tie-breaker so pages neither overlap nor skip results.
 */
@Service
@RequiredArgsConstructor
public class SearchService {

    /** Shortest query; one character would match nearly everything. */
    public static final int MIN_QUERY_LENGTH = 2;

    public static final int MAX_QUERY_LENGTH = 100;

    public static final int MAX_PAGE_SIZE = 50;

    private final PostService postService;
    private final UserRepository userRepository;
    private final TagRepository tagRepository;

    /**
     * Searches every kind, or only {@code type} when it is given.
     *
     * @throws AppException HTTP 400 if the trimmed query is shorter than
     *                      {@value #MIN_QUERY_LENGTH} or longer than
     *                      {@value #MAX_QUERY_LENGTH} characters, or the
     *                      page or size is out of range
     */
    @Transactional(readOnly = true)
    public SearchResultsDto search(String q, SearchType type, int page, int size) {
        String query = q == null ? "" : q.strip();
        if (query.length() < MIN_QUERY_LENGTH || query.length() > MAX_QUERY_LENGTH) {
            throw new AppException("The search query must have " + MIN_QUERY_LENGTH + " to "
                    + MAX_QUERY_LENGTH + " characters", HttpStatus.BAD_REQUEST);
        }
        if (page < 0 || size < 1 || size > MAX_PAGE_SIZE) {
            throw new AppException("page must be >= 0 and size between 1 and " + MAX_PAGE_SIZE,
                    HttpStatus.BAD_REQUEST);
        }
        String pattern = LikePatterns.containing(query);

        SearchResultsDto.SearchResultsDtoBuilder results = SearchResultsDto.builder().query(query);
        if (type == null || type == SearchType.POST) {
            PostFilter filter = new PostFilter(query, null, null, null, null, null);
            Sort order = Sort.by(Sort.Order.desc("lastActivityAt"), Sort.Order.desc("id"));
            results.posts(PagedResponse.from(postService.search(filter, PageRequest.of(page, size, order))));
        }
        if (type == null || type == SearchType.USER) {
            Sort order = Sort.by(Sort.Order.asc("username"), Sort.Order.asc("id"));
            results.users(PagedResponse.from(
                    userRepository.searchByStatus(pattern, UserStatus.ACTIVE, PageRequest.of(page, size, order)),
                    UserSummaryDto::from));
        }
        if (type == null || type == SearchType.TAG) {
            Sort order = Sort.by(Sort.Order.desc("postCount"), Sort.Order.asc("name"), Sort.Order.asc("id"));
            results.tags(PagedResponse.from(
                    tagRepository.searchInUse(pattern, PageRequest.of(page, size, order)), TagDto::from));
        }
        return results.build();
    }
}

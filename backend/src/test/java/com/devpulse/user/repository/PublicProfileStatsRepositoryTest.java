package com.devpulse.user.repository;

import com.devpulse.support.MigratedSchemaTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@MigratedSchemaTest
@Transactional
class PublicProfileStatsRepositoryTest {
    @Autowired private PublicProfileStatsRepository repository;
    @Autowired private JdbcTemplate jdbc;

    @Test
    void visibilityTransitionsExcludePrivateTreesAndPreserveTheirRecords() {
        String name = "visibility-" + UUID.randomUUID().toString().substring(0, 8);
        long author = jdbc.queryForObject("INSERT INTO users (username,email,password_hash) "
                + "VALUES (?,?,'hash') RETURNING id", Long.class, name, name + "@example.test");
        long post = post(author, name, "PUBLISHED");
        long locked = post(author, name + "-locked", "LOCKED");
        long draft = post(author, name + "-draft", "DRAFT");
        long deleted = post(author, name + "-deleted", "DELETED");
        comment(author, post, null, "VISIBLE", 0);
        long placeholder = comment(author, post, null, "DELETED", 0);
        comment(author, post, placeholder, "VISIBLE", 1);
        long hidden = comment(author, post, null, "HIDDEN", 0);
        comment(author, post, hidden, "VISIBLE", 1);
        comment(author, locked, null, "VISIBLE", 0);
        comment(author, draft, null, "VISIBLE", 0);
        comment(author, deleted, null, "VISIBLE", 0);

        assertThat(repository.counts(author)).isEqualTo(new PublicProfileStatsRepository.Counts(2, 3));
        jdbc.update("UPDATE posts SET status='DRAFT' WHERE id=?", post);
        assertThat(repository.counts(author)).isEqualTo(new PublicProfileStatsRepository.Counts(1, 1));
        jdbc.update("UPDATE posts SET status='PUBLISHED' WHERE id=?", post);
        assertThat(repository.counts(author)).isEqualTo(new PublicProfileStatsRepository.Counts(2, 3));
        jdbc.update("UPDATE posts SET status='DELETED' WHERE id=?", post);
        assertThat(repository.counts(author)).isEqualTo(new PublicProfileStatsRepository.Counts(1, 1));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM comments WHERE post_id=?", Long.class, post))
                .isEqualTo(5);
        assertThat(repository.counts(Long.MAX_VALUE)).isEqualTo(new PublicProfileStatsRepository.Counts(0, 0));
    }

    private long post(long author, String slug, String status) {
        return jdbc.queryForObject("INSERT INTO posts (user_id,title,slug,content,status) "
                + "VALUES (?,'Synthetic',?,'Body',CAST(? AS post_status)) RETURNING id",
                Long.class, author, slug, status);
    }

    private long comment(long author, long post, Long parent, String status, int depth) {
        return jdbc.queryForObject("INSERT INTO comments (user_id,post_id,parent_id,content,status,depth) "
                + "VALUES (?,?,?,'Synthetic',CAST(? AS comment_status),?) RETURNING id",
                Long.class, author, post, parent, status, depth);
    }
}

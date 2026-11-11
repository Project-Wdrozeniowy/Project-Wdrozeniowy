// Expected figures of the synthetic demo dataset (PWDRZ-187).
//
// An independent re-implementation of the rules in load-demo-data.sql, used
// as the oracle: `check.mjs` compares the running API with it, and
// `node tools/demo-data/oracle.mjs` prints the tables in the README.

import { pathToFileURL } from 'node:url';

export const FIRST_DAY = 1;
export const LAST_DAY = 69;
export const QUIET_DAYS = new Set([9, 10, 11, 25, 41, 42, 55]);
export const CATEGORIES = ['ai', 'gaming', 'politics', 'science', 'business', 'education', 'news'];
export const MEMBERS = 10;
export const ACCOUNTS = MEMBERS + 1;

const postsOn = (k) => {
  if (QUIET_DAYS.has(k)) return 0;
  if (k === 3) return 9;
  if (k === 34) return 7;
  return 1 + ((k * 7) % 4);
};

const statusOf = (k, j) => {
  if ((k * 5 + j) % 23 === 0) return 'DRAFT';
  if ((k * 5 + j) % 23 === 11) return 'DELETED';
  if ((k * 5 + j) % 29 === 7) return 'LOCKED';
  return 'PUBLISHED';
};

const openingsOf = (k, j) => {
  if (k === 3 && j === 0) return 40;
  if (k === 34 && j === 0) return 25;
  return 1 + ((k + j) % 5);
};

/** Every post with what the loader derives from it; `k` is days before the anchor. */
export function posts() {
  const result = [];
  for (let k = FIRST_DAY; k <= LAST_DAY; k++) {
    for (let j = 0; j < postsOn(k); j++) {
      const status = statusOf(k, j);
      const isPublic = status === 'PUBLISHED' || status === 'LOCKED';
      const author = 1 + ((k * 3 + j) % 8);
      const category = (k + 2 * j) % 8;
      const comments = [];
      if (status !== 'DRAFT') {
        for (let i = 0; i < (k + 3 * j) % 4; i++) {
          const day = k - i;
          if (day < FIRST_DAY || QUIET_DAYS.has(day)) continue;
          const n = k + j + i;
          comments.push({
            day,
            status: n % 13 === 0 ? 'HIDDEN' : n % 17 === 5 ? 'DELETED' : 'VISIBLE',
          });
        }
      }
      let votes = 0;
      let score = 0;
      let openings = 0;
      if (isPublic) {
        for (let v = 1; v <= MEMBERS; v++) {
          if (v === author || (k * j + v) % 3 !== 0) continue;
          votes++;
          score += (k + v) % 4 === 0 ? -1 : 1;
        }
        for (let t = 0; t < openingsOf(k, j); t++) {
          if (k - (t % 3) >= FIRST_DAY) openings++;
        }
      }
      result.push({
        k,
        j,
        slug: `demo-${k}-${j}`,
        status,
        isPublic,
        category: category === 0 ? null : CATEGORIES[category - 1],
        comments,
        votes,
        score,
        openings,
      });
    }
  }
  return result;
}

/** Public posts and visible comments on them for the day `k` days before the anchor (172's rules). */
export function publicDay(k, all = posts()) {
  let postCount = 0;
  let commentCount = 0;
  for (const post of all) {
    if (!post.isPublic) continue;
    if (post.k === k) postCount++;
    commentCount += post.comments.filter((c) => c.day === k && c.status === 'VISIBLE').length;
  }
  return { posts: postCount, comments: commentCount };
}

/** Totals of the window of `days` days that ends `endsBefore` days before the anchor, inclusive. */
export function windowTotals(days, endsBefore = 0, all = posts()) {
  const totals = { posts: 0, comments: 0 };
  for (let k = endsBefore; k < endsBefore + days; k++) {
    const day = publicDay(k, all);
    totals.posts += day.posts;
    totals.comments += day.comments;
  }
  return totals;
}

/** Public posts per category created in the window, with uncategorized posts under `null`. */
export function categoryCounts(days, all = posts()) {
  const counts = new Map([[null, 0], ...CATEGORIES.map((slug) => [slug, 0])]);
  for (const post of all) {
    if (post.isPublic && post.k < days) counts.set(post.category, counts.get(post.category) + 1);
  }
  return counts;
}

/** Row counts the loader prints when it finishes. */
export function loadedRows(all = posts()) {
  return {
    accounts: ACCOUNTS,
    posts: all.length,
    comments: all.reduce((sum, post) => sum + post.comments.length, 0),
    votes: all.reduce((sum, post) => sum + post.votes, 0),
    openings: all.reduce((sum, post) => sum + post.openings, 0),
  };
}

function markdown() {
  const all = posts();
  const lines = [];
  const rows = loadedRows(all);
  lines.push(
    '| Rows | Accounts | Posts | Comments | Votes | Openings |',
    '| --- | ---: | ---: | ---: | ---: | ---: |'
  );
  lines.push(
    `| Loaded | ${rows.accounts} | ${rows.posts} | ${rows.comments} | ${rows.votes} | ${rows.openings} |`,
    ''
  );

  const count = (status) => all.filter((p) => p.status === status).length;
  const commentCount = (status) =>
    all.flatMap((p) => p.comments).filter((c) => c.status === status).length;
  lines.push('| Controls | Count |', '| --- | ---: |');
  lines.push(
    `| Published posts | ${count('PUBLISHED')} |`,
    `| Locked posts | ${count('LOCKED')} |`
  );
  lines.push(`| Draft posts | ${count('DRAFT')} |`, `| Deleted posts | ${count('DELETED')} |`);
  lines.push(
    `| Visible comments | ${commentCount('VISIBLE')} |`,
    `| Hidden comments | ${commentCount('HIDDEN')} |`
  );
  lines.push(`| Deleted comments | ${commentCount('DELETED')} |`, '');

  lines.push(
    '| Window (UTC days, anchor day = 0) | Public posts | Visible comments on public posts |'
  );
  lines.push('| --- | ---: | ---: |');
  for (const [label, days, end] of [
    ['Last 7 days (0-6)', 7, 0],
    ['Last 30 days (0-29)', 30, 0],
    ['Previous 30 days (30-59)', 30, 30],
  ]) {
    const totals = windowTotals(days, end, all);
    lines.push(`| ${label} | ${totals.posts} | ${totals.comments} |`);
  }
  lines.push('');

  lines.push('| Day before anchor | Public posts | Visible comments |', '| ---: | ---: | ---: |');
  for (let k = 0; k <= 14; k++) {
    const day = publicDay(k, all);
    lines.push(`| ${k} | ${day.posts} | ${day.comments} |`);
  }
  lines.push('');

  lines.push('| Category, last 30 days | Public posts |', '| --- | ---: |');
  for (const [slug, n] of categoryCounts(30, all))
    lines.push(`| ${slug ?? '(uncategorized)'} | ${n} |`);
  lines.push('');

  lines.push('| Most opened posts | Openings (`viewCount`) |', '| --- | ---: |');
  for (const post of [...all].sort((a, b) => b.openings - a.openings).slice(0, 3)) {
    lines.push(`| \`${post.slug}\` | ${post.openings} |`);
  }
  return lines.join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(markdown());
}

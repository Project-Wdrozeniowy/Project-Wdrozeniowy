// Compares a running instance loaded with the synthetic demo dataset to the oracle (PWDRZ-187).
//
//   node tools/demo-data/check.mjs [--base http://localhost:3000] [--anchor YYYY-MM-DD]
//
// --anchor is the day the dataset was loaded for (default: today in UTC). Figures are
// compared by calendar date, so the check also works on later days.

import { parseArgs } from 'node:util';
import { posts, publicDay } from './oracle.mjs';

const { values } = parseArgs({
  options: {
    base: { type: 'string', default: 'http://localhost:3000' },
    anchor: { type: 'string', default: new Date().toISOString().slice(0, 10) },
  },
});

const DAY_MS = 24 * 60 * 60 * 1000;
const anchor = Date.parse(`${values.anchor}T00:00:00Z`);
if (Number.isNaN(anchor)) {
  console.error(`Invalid --anchor ${values.anchor}; use YYYY-MM-DD`);
  process.exit(2);
}

const all = posts();
let failures = 0;

function expectEqual(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(
    `${ok ? 'PASS' : 'FAIL'} ${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
  );
}

async function get(path) {
  const response = await fetch(`${values.base}/api${path}`, {
    headers: { Accept: 'application/json' },
  });
  return { status: response.status, body: response.ok ? await response.json() : null };
}

for (const period of ['7d', '30d']) {
  const { status, body } = await get(`/analytics/public/activity?period=${period}`);
  expectEqual(`GET /analytics/public/activity?period=${period} status`, status, 200);
  if (!body) continue;
  const expected = body.days.map((day) => {
    const k = Math.round((anchor - Date.parse(`${day.date}T00:00:00Z`)) / DAY_MS);
    return { date: day.date, ...publicDay(k, all) };
  });
  const actual = body.days.map(({ date, posts: p, comments }) => ({ date, posts: p, comments }));
  expectEqual(`${period} daily rows`, actual, expected);
  expectEqual(
    `${period} totals`,
    [body.totalPosts, body.totalComments],
    [expected.reduce((s, d) => s + d.posts, 0), expected.reduce((s, d) => s + d.comments, 0)]
  );
}

const feed = await get('/forum/posts?size=1');
expectEqual(
  'public posts in the feed',
  feed.body?.totalElements,
  all.filter((p) => p.isPublic).length
);

for (const post of [...all].sort((a, b) => b.openings - a.openings).slice(0, 3)) {
  const detail = await get(`/forum/posts/${post.slug}`);
  expectEqual(
    `${post.slug} viewCount, commentCount, voteScore`,
    [detail.body?.viewCount, detail.body?.commentCount, detail.body?.voteScore],
    [post.openings, post.comments.filter((c) => c.status !== 'DELETED').length, post.score]
  );
}

for (const status of ['DRAFT', 'DELETED']) {
  const control = all.find((p) => p.status === status);
  expectEqual(
    `${status.toLowerCase()} control ${control.slug} is hidden from guests`,
    (await get(`/forum/posts/${control.slug}`)).status,
    404
  );
}

console.log(failures === 0 ? 'All checks passed.' : `${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);

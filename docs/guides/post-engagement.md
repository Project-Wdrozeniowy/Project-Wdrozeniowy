# Post engagement and publication privacy

PWDRZ-194 establishes backend publication privacy; PWDRZ-167 exposes the summaries
below. Paths are relative to `/api`. Spring owns session and resource authorization.

| GET                            | Access                                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `/analytics/public/posts/{id}` | Public; only PUBLISHED/LOCKED posts. DRAFT/DELETED/missing returns 404, even to the author             |
| `/analytics/me/posts/{id}`     | The author only, including their draft. Guest: 401; another member or staff: 404; deleted/missing: 404 |
| `/analytics/posts/{id}`        | Existing staff analytics; ADMIN/MODERATOR permissions and fields are unchanged                         |

The public response contains exactly `postId`, `viewCount`, `commentCount`,
`voteScore`, `collectedFrom`. The owner response adds `upvoteCount` and
`downvoteCount`. Neither response contains visitor identities, reading histories,
demographics, unique reach or subscription totals.

`viewCount` is the stored intentional-opening total. V10 retired older GET-based
events and reset these totals. `collectedFrom` is the existing V11 collection
metadata, not a reconstructed publication-lifetime history or an exact inferred
V10 deployment timestamp. Reading these summaries, including HEAD, adds no openings.

`commentCount` includes all reachable VISIBLE comments through depth 5. HIDDEN
branches are excluded, DELETED placeholders are not counted, but visible replies
under deleted placeholders remain counted. This is more precise than the legacy
stored count on feed cards and the staff count of all VISIBLE rows. A presentation
must label and consume the intended metric, not silently treat them as equivalent.

`voteScore` is the stored signed score; UP/DOWN counts are votes on this post,
not votes on its comments. All counters are read from the same database statement
snapshot as the resource visibility check.

## Unpublishing and republication

The existing author PATCH changes PUBLISHED to DRAFT or DRAFT to PUBLISHED. It
preserves the slug, body, discussion, votes and opening history. A non-staff author
cannot use this operation to bypass LOCKED. Concurrent post writes lock and refresh
the row before validating access and editing, preserving newly committed counters
and moderation state. Existing staff privileges and deletion rules remain intact.

While a post is non-public its public summary is 404 and its contribution is
excluded from current public post/activity figures, even for historical windows.
Republication restores that public contribution. The owner's undeleted history
remains private. Deletion closes the owner summary as well; existing protected
staff analytics retain their current policy. Category visibility is unrelated.

Public user-profile counters count public posts and reachable visible comments
on public posts. Private own-profile totals retain their existing semantics.
This task does not introduce a new retention or tracking scheme.

## Frontend handoff

Use generated operations and schemas; the backend never returns the staff DTO as
a public response. Public and owner queries are distinct. Owner query compositions
must be account-scoped and follow existing logout/account replacement clearing.
After a publication transition, discard obsolete public results and refetch affected
views. Statistics refetch is not a navigation opening. These frontend controls,
cache changes and page integration belong to their FE tasks and are not implemented
by the backend delivery.

Server denial governs future reads; it cannot retract copies already received by
another person. No live remote-tab invalidation or new realtime infrastructure is
provided. See [sessions](sessions.md), [API bindings](api-bindings.md) and the
[execution record](../agent-task-backlog/pwdrz-167-execution.md) for access and evidence.

## Post-page insights (PWDRZ-169)

The post page places insights between the article and discussion. Guests and other
members read the public summary. Details reveals accumulated openings and their
UTC collection date without making another request. The current author reads the
owner summary instead, including UP/DOWN counts and their own draft. A staff role
does not grant access to another author's summary. No card is requested for deleted
posts or a non-owner viewing a non-public post through staff article permissions.

The card labels the aggregate **Visible comments**, including replies. The
discussion heading separately counts root threads, and article/feed counts keep
their existing semantics. A score of zero is not evidence that nobody voted.
Opening totals start at the returned collectedFrom; they are not unique readers.

Author query keys include the current account ID. The card's post/account key
also resets local presentation and detaches old observers. Session generations,
request cancellation and the existing provider clearing prevent late answers
from reappearing after logout or account replacement. A check of the same session
retains the card. An author 401 follows the shared session handler; 403 does not
sign out the account. A summary 404 also revalidates the article.

Refresh insights reads both the summary and article. It preserves the discussion
and its unsent draft, prevents duplicate activation, and does not report success
if either read fails. These GETs are independent snapshots, not an atomic combined
response. Accepted post votes and comment creation/reply/deletion cancel old
summary reads and invalidate only that post's public/account-scoped summary keys.
Inactive copies are marked stale; refetch failure does not undo an accepted write.

Initial loading uses a named skeleton. Errors replace the figures with a fixed
message and recovery control; raw server detail/transport messages are not shown.
Retry remains mounted while running and on another failure. A successful keyboard
retry returns focus to Details (public) or Refresh insights (author), provided the
reader has not moved outside the card. Refresh/loading statuses are announced.

PWDRZ-171 owns daily charts, compact trend bars, 7/30-day selection and daily tables.
The summary does not display nonfunctional controls for that work. PWDRZ-166 owns
navigation/reload opening delivery: no summary read, disclosure or refresh records
an opening. See the [approved implementation plan](../agent-task-backlog/pwdrz-169-implementation-plan.md)
and [PWDRZ-169 execution evidence](../agent-task-backlog/pwdrz-169-execution.md).

# PWDRZ-118 — coverage provider comparison (existing tests)

2026-10-16; source SHA `cc998e7ec9f627be613f902638b96cc780d4f40e`, expanded stage-3 coverage scope. Both runs used Vitest/provider 3.2.4, Node 24.15.0 and the same 46 suites / 496 existing tests. Source/test files and package manifests matched HEAD before the first frontend edit; coverage config SHA-256: `278062AFD4FC43D598881896B34522A1AAFAF5B39B5542F671AFF6DEF6595E45`. Counts are covered/total; no threshold override was used.

| Provider | Statements | Lines | Branches | Functions | Report files |
| --- | ---: | ---: | ---: | ---: | ---: |
| v8 | 2564/3629 (70.65%) | 2564/3629 (70.65%) | 742/802 (92.51%) | 229/264 (86.74%) | 129 |
| istanbul | 838/1001 (83.71%) | 739/892 (82.84%) | 579/703 (82.36%) | 281/355 (79.15%) | 115 |

## Per-file denominator and counters

All 115 executable production files are present with both providers. The 14 additional V8 entries are type-only DTO files with 0/0 line counters; Istanbul omits them. No executable source was dropped to produce the smaller denominator.

Before adding tests, 33 files had no executed lines. V8 assigned only 33 branch counters to these files; Istanbul identified 82 branches and 63 functions in the same files, all unexecuted. Login is 0/116 lines but 1/1 branches and 1/1 functions with the current V8 configuration; Istanbul reports 0/15 lines, 0/16 branches, 0/3 functions. Register is 0/214, 1/1, 1/1 with V8 versus 0/22, 0/30, 0/7 with Istanbul.

The changed denominator is an instrumentation/remapping difference, not improved testing: lines -2737, statements -2628, branches -99 and functions +91. V8 line ranges include much more JSX/source text, while Istanbul assigns executable statement locations. Source inclusion and thresholds were the same. Both commands exited 0 and ran all 496 existing tests; elapsed times were 31.96s and 27.76s respectively, one sample under normal host load, not a controlled performance benchmark.

The installed/pinned 3.2.4 V8 provider gates AST remapping behind `experimentalAstAwareRemapping`, which is not enabled in the current config. This was confirmed in installed provider.js and the [version-pinned upstream source](https://github.com/vitest-dev/vitest/blob/v3.2.4/packages/coverage-v8/src/provider.ts). Generic documentation for another version/default must not be substituted for this measured behavior. V8 with that option or a newer runner has not been measured here.

Recommendation for PWDRZ-118: adopt pinned Istanbul after the configuration decision, use **lines and branches** as the primary frontend gate metrics, and retain functions/statements as diagnostic reports initially. This recommendation follows the more informative unimported-file counters; it does not depend on Istanbul producing a higher line percentage. Numeric thresholds remain undecided. Preserve explicit `src/**/*.{ts,tsx}` inclusion and the narrow infrastructure/test exclusions. Keep auth scenario tables alongside global percentages: even a good aggregate can hide registration branches.

The final config still selects V8. No manifest/lockfile was changed for this experiment. A permanent switch requires declaring matching Vitest/provider versions, keeping the same scope, establishing its accepted baseline, and demonstrating gate rejection/pass. There is no claim that an uncommitted local experiment has passed GitHub CI.

## Reproduction

The successful experimental installation used package archives, since normal no-save npm installation tried to resolve a newer incompatible peer graph. `npm pack @vitest/coverage-istanbul@3.2.4` and `npm pack istanbul-lib-instrument@6.0.3` were downloaded to ignored `backend/target/` and unpacked into their respective ignored `frontend/node_modules/` directories; all other required dependencies were already installed. No dependency manifest or lockfile changed. The two interrupted dependency-resolution attempts are not coverage runs.

From frontend, with matching installed packages and the stage-3 config:

```powershell
node node_modules/vitest/vitest.mjs run --coverage.enabled --coverage.provider=v8 --coverage.reportsDirectory=coverage/pwdrz118-v8 --coverage.reporter=text --coverage.reporter=lcov --coverage.reporter=json --coverage.reporter=json-summary
node node_modules/vitest/vitest.mjs run --coverage.enabled --coverage.provider=istanbul --coverage.reportsDirectory=coverage/pwdrz118-istanbul --coverage.reporter=text --coverage.reporter=lcov --coverage.reporter=json --coverage.reporter=json-summary
```

Logs: `backend/target/pwdrz118-compare-{v8,istanbul}.log`. Raw reports remain under the two directories above. Input path/hash inventory captured after both runs and before frontend edits: `backend/target/pwdrz118-provider-input-after.txt`, SHA-256 `af6bffca6ec6f932eb87e7965a3bba480275917d03a53a122546c056b7d307fd`. At that checkpoint `git diff --exit-code -- frontend/src frontend/package.json frontend/package-lock.json` was empty, and no frontend source/test edits occurred between the runs. The first attempted input-manifest command used root-relative pathspecs from the frontend directory and produced no file; it is not used as evidence.

The comparison above is **before risk-package edits**. The expanded test suite and token-cleanup fix were measured separately afterward: 48 suites / 509 tests pass; Istanbul lines 779/895 = 87.03%, statements 879/1005 = 87.46%, branches 611/705 = 86.66%, functions 290/355 = 81.69%. Compared within Istanbul, this adds 40 covered lines with 3 extra total lines, and 32 covered branches with 2 extra total branches. Register still has 15/30 branches, including provisional interests behavior; no complete-auth-coverage claim is made.

## Full file comparison

| Source | V8 lines | Istanbul lines | V8 branches | Istanbul branches | V8 functions | Istanbul functions |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `src/app/(auth)/layout.tsx` | 0/6 | 0/1 | 0/1 | 0/0 | 0/1 | 0/1 |
| `src/app/(auth)/login/page.tsx` | 0/116 | 0/15 | 1/1 | 0/16 | 1/1 | 0/3 |
| `src/app/(auth)/register/page.tsx` | 0/214 | 0/22 | 1/1 | 0/30 | 1/1 | 0/7 |
| `src/app/(main)/(protected)/admin/layout.tsx` | 0/4 | 0/1 | 0/1 | 0/0 | 0/1 | 0/1 |
| `src/app/(main)/(protected)/admin/page.tsx` | 0/7 | 0/1 | 0/1 | 0/0 | 0/1 | 0/1 |
| `src/app/(main)/(protected)/dashboard/_lib/dashboard.const.ts` | 0/33 | 0/7 | 0/1 | 0/0 | 0/1 | 0/0 |
| `src/app/(main)/(protected)/dashboard/_ui/BarChart.tsx` | 0/48 | 0/15 | 0/1 | 0/5 | 0/1 | 0/4 |
| `src/app/(main)/(protected)/dashboard/_ui/ChartCard.tsx` | 0/11 | 0/1 | 0/1 | 0/0 | 0/1 | 0/1 |
| `src/app/(main)/(protected)/dashboard/_ui/LineChart.tsx` | 0/73 | 0/20 | 0/1 | 0/7 | 0/1 | 0/8 |
| `src/app/(main)/(protected)/dashboard/_ui/PostsCard.tsx` | 0/19 | 0/2 | 0/1 | 0/0 | 0/1 | 0/2 |
| `src/app/(main)/(protected)/dashboard/_ui/StatCard.tsx` | 0/23 | 0/2 | 0/1 | 0/4 | 0/1 | 0/1 |
| `src/app/(main)/(protected)/dashboard/_ui/StatsGrid.tsx` | 0/17 | 0/3 | 0/1 | 0/0 | 0/1 | 0/2 |
| `src/app/(main)/(protected)/dashboard/_ui/TopPostRow.tsx` | 0/21 | 0/1 | 0/1 | 0/0 | 0/1 | 0/1 |
| `src/app/(main)/(protected)/dashboard/_ui/TopPosts.tsx` | 0/17 | 0/2 | 0/1 | 0/0 | 0/1 | 0/2 |
| `src/app/(main)/(protected)/dashboard/page.tsx` | 0/36 | 0/2 | 0/1 | 0/0 | 0/1 | 0/2 |
| `src/app/(main)/(protected)/layout.tsx` | 0/4 | 0/1 | 0/1 | 0/0 | 0/1 | 0/1 |
| `src/app/(main)/(protected)/profile/_ui/PostsSkeleton.tsx` | 0/12 | 0/2 | 0/1 | 0/0 | 0/1 | 0/2 |
| `src/app/(main)/(protected)/profile/_ui/ProfileCard.tsx` | 48/48 | 10/10 | 12/14 | 15/17 | 3/3 | 3/3 |
| `src/app/(main)/(protected)/profile/_ui/ProfileLoadError.tsx` | 14/14 | 1/1 | 1/2 | 1/3 | 1/1 | 1/1 |
| `src/app/(main)/(protected)/profile/_ui/ProfileSkeleton.tsx` | 22/22 | 2/2 | 2/2 | 0/0 | 1/1 | 2/2 |
| `src/app/(main)/(protected)/profile/_ui/ProfileTabs.tsx` | 0/22 | 0/5 | 1/1 | 0/2 | 1/1 | 0/3 |
| `src/app/(main)/(protected)/profile/_ui/ProfileView.tsx` | 19/19 | 6/6 | 6/6 | 4/4 | 2/2 | 2/2 |
| `src/app/(main)/(protected)/profile/_ui/profileView.const.ts` | 6/6 | 2/2 | 0/0 | 0/0 | 0/0 | 0/0 |
| `src/app/(main)/(protected)/profile/page.tsx` | 0/11 | 0/1 | 0/1 | 0/0 | 0/1 | 0/1 |
| `src/app/(main)/_lib/categoryColor.ts` | 7/7 | 4/4 | 9/9 | 6/6 | 1/1 | 2/2 |
| `src/app/(main)/_lib/postCard.const.ts` | 1/1 | 1/1 | 0/0 | 0/0 | 0/0 | 0/0 |
| `src/app/(main)/_lib/postCard.ts` | 19/19 | 2/2 | 9/10 | 9/10 | 1/1 | 1/1 |
| `src/app/(main)/_ui/HomeFeed.tsx` | 35/35 | 7/8 | 11/11 | 11/11 | 2/3 | 3/4 |
| `src/app/(main)/_ui/PostCard.tsx` | 58/58 | 2/2 | 6/6 | 8/8 | 1/1 | 1/1 |
| `src/app/(main)/_ui/PostFeedError.tsx` | 14/14 | 1/1 | 3/3 | 3/3 | 1/1 | 1/1 |
| `src/app/(main)/_ui/PostFeedSkeleton.tsx` | 23/23 | 3/3 | 2/2 | 1/1 | 1/1 | 2/2 |
| `src/app/(main)/_ui/forumFeed.const.ts` | 1/1 | 1/1 | 0/0 | 0/0 | 0/0 | 0/0 |
| `src/app/(main)/_ui/homeFeed.const.ts` | 2/2 | 2/2 | 0/0 | 0/0 | 0/0 | 0/0 |
| `src/app/(main)/_ui/postCard.const.ts` | 1/1 | 1/1 | 0/0 | 0/0 | 0/0 | 0/0 |
| `src/app/(main)/forum/[slug]/page.tsx` | 0/30 | 0/3 | 0/1 | 0/0 | 0/1 | 0/2 |
| `src/app/(main)/forum/_lib/forumFeed.ts` | 9/9 | 4/4 | 10/10 | 6/6 | 2/2 | 3/3 |
| `src/app/(main)/forum/_ui/CategoryFilter.tsx` | 23/23 | 4/4 | 6/6 | 2/2 | 2/2 | 4/4 |
| `src/app/(main)/forum/_ui/EmptyFeed.tsx` | 19/19 | 3/3 | 5/5 | 4/4 | 1/1 | 1/1 |
| `src/app/(main)/forum/_ui/ForumFeed.tsx` | 95/95 | 30/31 | 37/37 | 34/34 | 6/7 | 9/10 |
| `src/app/(main)/forum/_ui/PostPagination.tsx` | 34/34 | 7/7 | 8/8 | 11/11 | 3/3 | 3/3 |
| `src/app/(main)/forum/page.tsx` | 0/16 | 0/1 | 0/1 | 0/0 | 0/1 | 0/1 |
| `src/app/(main)/layout.tsx` | 0/16 | 0/1 | 0/1 | 0/0 | 0/1 | 0/1 |
| `src/app/(main)/page.tsx` | 0/28 | 0/5 | 1/1 | 0/2 | 1/1 | 0/3 |
| `src/app/_guards/AuthGuard.tsx` | 17/17 | 9/9 | 10/10 | 8/8 | 1/1 | 4/4 |
| `src/app/_guards/RoleGuard.tsx` | 21/21 | 13/13 | 14/14 | 12/12 | 1/1 | 4/4 |
| `src/app/_guards/SessionLoader.tsx` | 7/7 | 1/1 | 1/1 | 0/0 | 1/1 | 1/1 |
| `src/app/_providers/AuthProvider.tsx` | 26/26 | 13/13 | 10/10 | 2/4 | 2/2 | 6/6 |
| `src/app/_providers/QueryProvider.tsx` | 46/46 | 16/17 | 11/12 | 9/10 | 1/2 | 4/6 |
| `src/app/_providers/ToastProvider.tsx` | 0/4 | 0/1 | 1/1 | 0/0 | 1/1 | 0/1 |
| `src/app/layout.tsx` | 0/27 | 0/3 | 1/1 | 0/0 | 1/1 | 0/1 |
| `src/features/create-post/CreatePostButton.tsx` | 30/30 | 14/14 | 11/11 | 6/6 | 3/3 | 6/6 |
| `src/features/create-post/CreatePostDialog.tsx` | 134/134 | 58/58 | 46/47 | 47/50 | 8/8 | 13/13 |
| `src/features/create-post/CreatePostForm.tsx` | 223/223 | 45/45 | 54/59 | 56/60 | 6/6 | 12/12 |
| `src/features/create-post/FieldLabel.tsx` | 18/18 | 1/1 | 3/4 | 5/6 | 1/1 | 1/1 |
| `src/features/create-post/TagInput.tsx` | 91/91 | 30/30 | 29/30 | 33/34 | 6/6 | 7/7 |
| `src/features/create-post/createPost.const.ts` | 30/30 | 14/14 | 0/0 | 0/0 | 0/0 | 0/0 |
| `src/features/create-post/createPost.schema.ts` | 16/16 | 1/1 | 0/0 | 0/0 | 0/0 | 0/0 |
| `src/features/create-post/createPost.ts` | 48/48 | 25/25 | 27/28 | 21/22 | 7/7 | 8/8 |
| `src/features/edit-profile/ProfileForm.tsx` | 165/165 | 32/32 | 30/37 | 32/38 | 4/4 | 6/6 |
| `src/features/edit-profile/profile.const.ts` | 23/23 | 10/10 | 0/0 | 0/0 | 0/0 | 0/0 |
| `src/features/edit-profile/profile.schema.ts` | 23/23 | 2/2 | 2/2 | 2/2 | 1/1 | 1/1 |
| `src/features/edit-profile/profile.ts` | 42/42 | 19/19 | 16/16 | 18/18 | 4/4 | 4/4 |
| `src/features/post-comments/CommentForm.tsx` | 68/68 | 16/16 | 10/11 | 14/15 | 3/3 | 3/3 |
| `src/features/post-comments/CommentItem.tsx` | 95/95 | 16/17 | 19/20 | 17/17 | 4/5 | 6/7 |
| `src/features/post-comments/CommentSection.tsx` | 73/73 | 17/17 | 35/36 | 29/30 | 5/5 | 11/11 |
| `src/features/post-comments/comment.const.ts` | 2/2 | 2/2 | 0/0 | 0/0 | 0/0 | 0/0 |
| `src/features/post-comments/comments.ts` | 12/12 | 5/5 | 9/9 | 9/9 | 3/3 | 3/3 |
| `src/features/post-interactions/ActionButton.tsx` | 11/11 | 1/1 | 1/1 | 0/1 | 1/1 | 1/1 |
| `src/features/post-interactions/PostVoteColumn.tsx` | 26/26 | 10/10 | 9/10 | 5/6 | 2/2 | 4/4 |
| `src/features/post-interactions/VoteButton.tsx` | 28/28 | 2/2 | 11/11 | 13/14 | 1/1 | 1/1 |
| `src/features/post-interactions/VoteColumn.tsx` | 40/40 | 8/8 | 13/14 | 11/12 | 4/4 | 4/4 |
| `src/features/sign-in/login.schema.ts` | 0/12 | 0/1 | 0/1 | 0/0 | 0/1 | 0/0 |
| `src/features/sign-up/register.schema.ts` | 0/28 | 0/2 | 0/1 | 0/0 | 0/1 | 0/1 |
| `src/shared/api/ai/ai.dto.ts` | 0/0 | no entry | 1/1 | no entry | 1/1 | no entry |
| `src/shared/api/ai/aiClient.ts` | 5/5 | 2/2 | 1/1 | 0/0 | 1/1 | 1/1 |
| `src/shared/api/analytics/analytics.dto.ts` | 0/0 | no entry | 1/1 | no entry | 1/1 | no entry |
| `src/shared/api/analytics/analyticsClient.ts` | 21/21 | 9/9 | 7/7 | 6/6 | 7/7 | 7/7 |
| `src/shared/api/auth/auth.dto.ts` | 0/0 | no entry | 1/1 | no entry | 1/1 | no entry |
| `src/shared/api/auth/authClient.ts` | 14/14 | 6/6 | 4/4 | 0/0 | 4/4 | 4/4 |
| `src/shared/api/client/api.ts` | 102/108 | 51/56 | 35/38 | 21/26 | 9/9 | 15/16 |
| `src/shared/api/client/apiError.ts` | 10/10 | 4/4 | 8/8 | 6/6 | 2/2 | 2/2 |
| `src/shared/api/client/pagination.dto.ts` | 0/0 | no entry | 1/1 | no entry | 1/1 | no entry |
| `src/shared/api/client/problem.dto.ts` | 0/0 | no entry | 1/1 | no entry | 1/1 | no entry |
| `src/shared/api/forum/category.dto.ts` | 0/0 | no entry | 1/1 | no entry | 1/1 | no entry |
| `src/shared/api/forum/comment.dto.ts` | 0/0 | no entry | 1/1 | no entry | 1/1 | no entry |
| `src/shared/api/forum/commentQuery.const.ts` | 1/1 | 1/1 | 0/0 | 0/0 | 0/0 | 0/0 |
| `src/shared/api/forum/feedQuery.const.ts` | 3/3 | 3/3 | 0/0 | 0/0 | 0/0 | 0/0 |
| `src/shared/api/forum/forumClient.ts` | 49/49 | 24/24 | 19/19 | 5/5 | 19/19 | 19/19 |
| `src/shared/api/forum/post.dto.ts` | 0/0 | no entry | 1/1 | no entry | 1/1 | no entry |
| `src/shared/api/forum/postVote.ts` | 22/22 | 6/6 | 15/15 | 10/10 | 4/4 | 6/6 |
| `src/shared/api/forum/tag.dto.ts` | 0/0 | no entry | 1/1 | no entry | 1/1 | no entry |
| `src/shared/api/forum/useCategories.ts` | 13/13 | 4/4 | 4/4 | 0/0 | 2/2 | 3/3 |
| `src/shared/api/forum/useComments.ts` | 24/24 | 11/11 | 8/8 | 2/2 | 6/6 | 6/6 |
| `src/shared/api/forum/useCreatePost.ts` | 14/14 | 5/5 | 3/3 | 0/0 | 3/3 | 3/3 |
| `src/shared/api/forum/useForumPosts.ts` | 17/17 | 4/4 | 7/7 | 2/2 | 3/3 | 3/3 |
| `src/shared/api/forum/useVotePost.ts` | 51/51 | 24/24 | 26/27 | 23/24 | 5/5 | 6/6 |
| `src/shared/api/forum/vote.const.ts` | 5/5 | 4/4 | 0/0 | 0/0 | 0/0 | 0/0 |
| `src/shared/api/forum/vote.dto.ts` | 0/0 | no entry | 1/1 | no entry | 1/1 | no entry |
| `src/shared/api/notification/notification.dto.ts` | 0/0 | no entry | 1/1 | no entry | 1/1 | no entry |
| `src/shared/api/notification/notificationClient.ts` | 9/9 | 5/5 | 4/4 | 1/1 | 4/4 | 4/4 |
| `src/shared/api/profile/useMyProfile.ts` | 12/12 | 4/4 | 4/4 | 0/0 | 3/3 | 4/4 |
| `src/shared/api/profile/useUpdateProfile.ts` | 18/18 | 8/8 | 4/4 | 0/0 | 3/3 | 4/4 |
| `src/shared/api/recommendation/recommendation.dto.ts` | 0/0 | no entry | 1/1 | no entry | 1/1 | no entry |
| `src/shared/api/user/user.dto.ts` | 0/0 | no entry | 1/1 | no entry | 1/1 | no entry |
| `src/shared/api/user/userClient.ts` | 11/11 | 5/5 | 4/4 | 0/0 | 4/4 | 4/4 |
| `src/shared/api/websocket/forumEvent.dto.ts` | 0/0 | no entry | 1/1 | no entry | 1/1 | no entry |
| `src/shared/auth/tokenMemory.ts` | 7/7 | 4/4 | 2/2 | 0/0 | 2/2 | 2/2 |
| `src/shared/constants/categories.const.ts` | 42/42 | 23/23 | 5/5 | 4/4 | 1/1 | 5/5 |
| `src/shared/lib/cn.ts` | 4/4 | 1/1 | 1/1 | 0/0 | 1/1 | 1/1 |
| `src/shared/lib/toast.ts` | 8/8 | 3/6 | 1/1 | 0/0 | 1/4 | 1/4 |
| `src/shared/lib/url.ts` | 8/8 | 4/4 | 3/3 | 2/2 | 1/1 | 1/1 |
| `src/shared/ui/FormField.tsx` | 24/24 | 1/1 | 3/5 | 6/8 | 1/1 | 1/1 |
| `src/shared/ui/OrbitaLogo.tsx` | 16/16 | 1/1 | 1/1 | 0/1 | 1/1 | 1/1 |
| `src/shared/ui/icons.tsx` | 124/153 | 8/10 | 8/8 | 0/0 | 8/10 | 8/10 |
| `src/store/index.ts` | 7/7 | 1/1 | 1/1 | 0/0 | 0/0 | 1/1 |
| `src/store/slices/authSlice.ts` | 16/16 | 7/7 | 8/8 | 2/2 | 5/5 | 6/6 |
| `src/store/slices/uiSlice.ts` | 4/4 | 2/2 | 2/2 | 0/0 | 2/2 | 2/2 |
| `src/utils/format.ts` | 19/19 | 13/13 | 17/17 | 13/14 | 3/3 | 3/3 |
| `src/widgets/header/Header.tsx` | 42/42 | 11/11 | 6/6 | 0/0 | 2/2 | 5/5 |
| `src/widgets/header/ui/NavLinks.tsx` | 28/28 | 4/4 | 10/10 | 8/8 | 2/2 | 3/3 |
| `src/widgets/header/ui/SearchBar.tsx` | 15/15 | 1/1 | 1/1 | 0/0 | 1/1 | 1/1 |
| `src/widgets/header/ui/UserActions.tsx` | 29/41 | 1/1 | 1/3 | 4/6 | 1/1 | 1/1 |
| `src/widgets/header/ui/header.const.ts` | 5/5 | 1/1 | 0/0 | 0/0 | 0/0 | 0/0 |
| `src/widgets/sidebar/Sidebar.tsx` | 0/26 | 0/5 | 1/1 | 0/8 | 1/1 | 0/2 |
| `src/widgets/sidebar/ui/GuestCard.tsx` | 0/21 | 0/1 | 0/1 | 0/0 | 0/1 | 0/1 |
| `src/widgets/sidebar/ui/LiveActivity.tsx` | 0/24 | 0/2 | 0/1 | 0/0 | 0/1 | 0/2 |
| `src/widgets/sidebar/ui/TrendingTopics.tsx` | 0/27 | 0/2 | 0/1 | 0/0 | 0/1 | 0/2 |
| `src/widgets/sidebar/ui/UserCard.tsx` | 0/47 | 0/4 | 0/1 | 0/8 | 0/1 | 0/3 |
| `src/widgets/sidebar/ui/sidebar.const.ts` | 0/18 | 0/4 | 0/1 | 0/0 | 0/1 | 0/0 |

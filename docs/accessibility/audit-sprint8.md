# Accessibility audit, Sprint 8: core user journeys

Source revision: `f552be7` (branch `develop`).
Method: static review of the source code. The application was not run.
Target: WCAG 2.2 AA as an engineering target. This document does not assert
WCAG or legal compliance for the whole application.

## Scope and method

Routes reviewed:

| Route            | Reviewed                                              |
| ---------------- | ----------------------------------------------------- |
| `/login`         | form, error handling, links                           |
| `/` and `/forum` | create-post dialog, feed, category filter, pagination |
| `/forum/[slug]`  | post detail page                                      |
| `/dashboard`     | stat cards and charts                                 |
| Shared           | `app/layout.tsx`, `app/(main)/layout.tsx` landmarks   |

Contrast ratios were computed with the WCAG relative luminance formula from
colour values in the code and stylesheet. The real page background was not
measured.

## What was not verified

- **NVDA and browsers.** No screen reader, browser or operating system was
  used, so no assistive-technology versions and no announced output are
  recorded. The manual procedure is in
  [manual-test-script.md](manual-test-script.md).
- **Viewports.** Reflow at 320 px and 390 px was not measured. Entries
  that depend on it are marked as suspected.
- **Application architecture in the task text.** The task describes a
  Vite/React Router SPA served by Express with Spring JDBC sessions and CSRF.
  The repository contains a Next.js 16 frontend, an Express gateway that only
  proxies `/api`, and a Spring backend with CSRF disabled
  (`backend/src/main/java/com/devpulse/config/SecurityConfig.java`, line 81).
  The audit covers the code that exists.
- **Dashboard data.** The dashboard shows mock data (PWDRZ-145,
  `dashboard.const.ts`, line 1). It contains month labels only, no dates.
- **Tickets PWDRZ-28, PWDRZ-158 and PWDRZ-159.** No marker for these keys
  exists in the source, tests or documentation of this repository. No barrier
  is assigned to them in this document.

## Barriers

All barriers are unresolved. No code was changed.

| ID  | Route and location                                                            | Expected                                                                     | Observed                                                                                                                                                             | WCAG 2.2              | Severity     |
| --- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------------ |
| A1  | Feed `/` and `/forum`: `PostCard.tsx` lines 19-71, `HomeFeed.tsx` lines 35-37 | The post title links to `/forum/{slug}`                                      | The card has no link. The only link to a post is shown after publishing (`CreatePostForm.tsx`, line 150). A post cannot be opened from the feed by keyboard or mouse | 2.1.1, functional gap | High         |
| A2  | Detail `/forum/[slug]`: `page.tsx`, line 8                                    | The post text is displayed                                                   | Pulsing skeleton blocks and the slug are shown. Comments are provisional (`CommentSection.tsx`, line 1; PWDRZ-142 and PWDRZ-67). The post cannot be read             | Functional gap        | High         |
| A3  | Dashboard: `LineChart.tsx` line 33, `BarChart.tsx` line 22                    | Values are reachable by keyboard and screen reader                           | Each SVG has `aria-hidden`. There is no table or text alternative. Values by date cannot be investigated                                                             | 1.1.1, 1.3.1, 2.1.1   | High         |
| A4  | Dashboard: line colour `#2563eb` on `slate-800`                               | Non-text contrast of at least 3:1                                            | 2.83:1. The violet `#8b5cf6` gives 3.45:1 and the green `#10b981` gives 5.77:1                                                                                       | 1.4.11                | Medium       |
| A5  | Dashboard: stat cards, `grid grid-cols-2` with no narrow-screen variant       | Content reflows without horizontal scrolling at 320 px                       | Suspected overflow: `text-3xl` value plus a 48 px icon in a half-width card. Not measured                                                                            | 1.4.10                | Not assessed |
| A6  | `/login`: `page.tsx` lines 77-79 and 100-102                                  | Field errors are tied to the field and announced                             | No `aria-invalid`, `aria-describedby` or `role="alert"`. The server error block (lines 62-64) has no `role="alert"`                                                  | 3.3.1, 4.1.3          | Medium       |
| A7  | `/login` and the create-post form: `text-red-500`                             | Error text of at least 4.5:1                                                 | 3.76:1 on white and 3.42:1 on the input background `#f3f4f6` (`CreatePostForm.tsx`, line 45)                                                                         | 1.4.3                 | Medium       |
| A8  | `/login`: `page.tsx` lines 87-92                                              | The "Forgot password?" link leads to a page                                  | It points to `/forgot-password`. No such route exists under `frontend/src/app`                                                                                       | Functional gap        | Medium       |
| A9  | `/login`: `page.tsx` lines 119-129                                            | Provider buttons work or are not shown                                       | Google, GitHub and Discord buttons have no handler and do nothing                                                                                                    | 4.1.2                 | Medium       |
| A10 | Home `/`: sort tabs Hot, New, Top                                             | The selected tab is exposed to assistive technology and changes the feed     | No `aria-pressed` or `aria-selected`. The active tab is shown by colour only. `HomeFeed` takes no props, so the tabs change nothing                                  | 1.4.1, 4.1.2          | Medium       |
| A11 | Post card: `PostCard.tsx` lines 56-68, `ActionButton.tsx` lines 11-15         | The reason a control is unavailable is available to keyboard and touch users | Comments, Share and Save are `disabled` and the reason is in `title` only                                                                                            | 1.3.1, 4.1.2          | Low          |
| A12 | Shared: `(main)/layout.tsx` line 12, `admin/page.tsx` line 3                  | One `main` landmark and a way to skip repeated content                       | The admin page nests a second `main` inside the layout `main`. There is no skip link                                                                                 | 1.3.1, 2.4.1          | Low          |
| A13 | `/forum/[slug]`: `page.tsx`, `CommentSection.tsx` line 53                     | The page has a top-level heading                                             | The first heading is an `h2` ("Comments"). There is no `h1`                                                                                                          | 1.3.1, 2.4.6          | Low          |
| A14 | `/forum/[slug]`: `text-slate-500 text-xs` slug caption                        | Text contrast of at least 4.5:1                                              | 3.07:1 on `slate-800`                                                                                                                                                | 1.4.3                 | Low          |

Owner for every barrier: the feature owner. Assignment to tickets is described
in "Action Items for Acceptance".

## Contrast calculations

| Pair                                              | Ratio   |
| ------------------------------------------------- | ------- |
| `gray-500` `#6b7280` on white                     | 4.83:1  |
| `gray-500` placeholder on `#f3f4f6`               | 4.39:1  |
| `red-500` `#ef4444` on white                      | 3.76:1  |
| `red-500` on `#f3f4f6`                            | 3.42:1  |
| `red-700` `#b91c1c` on `red-50` `#fef2f2`         | 5.91:1  |
| `emerald-700` `#047857` on `emerald-50` `#ecfdf5` | 5.21:1  |
| `slate-400` `#94a3b8` on `slate-800` `#1e293b`    | 5.71:1  |
| `slate-500` `#64748b` on `slate-800`              | 3.07:1  |
| `gray-50` on `slate-800`                          | 14.00:1 |
| `blue-600` `#2563eb` on `slate-800`               | 2.83:1  |
| `violet` `#8b5cf6` on `slate-800`                 | 3.45:1  |
| `emerald` `#10b981` on `slate-800`                | 5.77:1  |
| white on `blue-600`                               | 5.17:1  |

## Positive findings from the code

These are code observations and still need confirmation with a screen reader.

- Create-post dialog (`CreatePostDialog.tsx`): `role="dialog"`,
  `aria-modal`, `aria-labelledby`, Tab kept inside, Escape closes, and focus
  returns to the opener on close (lines 44-51).
- Create-post form (`CreatePostForm.tsx`): `label` with `htmlFor`,
  `aria-invalid`, `aria-describedby`, `role="alert"` on field errors, and
  focus moved to the first rejected field.
- Pagination (`PostPagination.tsx`): `nav` with `aria-label`, a live region
  for the page number, and `aria-disabled` so focus is kept while loading.
- Category filter: `aria-pressed` on each button.
- Stat cards: the change is shown with a sign, not by colour alone.
- Document language is set (`lang="en"`, `app/layout.tsx`, line 24).

## Result per journey

| Journey     | Static result                                                                                                                                  |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Login       | Labels and submit inside a form are present. Error announcement is not supported by the markup (A6, A7), and two controls do not work (A8, A9) |
| Create post | The keyboard path through the dialog looks complete in code. Needs browser and NVDA confirmation. Error contrast fails (A7)                    |
| Feed        | Filter and pagination are accessible by design. Opening a post is not possible (A1). Sort tabs are not exposed (A10)                           |
| Detail      | Blocked (A2). Heading structure and caption contrast are weak (A13, A14)                                                                       |
| Dashboard   | Values are not reachable (A3). Chart contrast and narrow-screen layout need action or measurement (A4, A5)                                     |

## Remaining limitations

- No assistive-technology, browser or viewport run has been performed. All
  findings are static.
- Contrast values use colours from the code, not measured page backgrounds.
- Behaviour that depends on the API (feed content, categories) was not
  exercised.
- Category badge colours (`getCategoryColor`) and the `Share`, `Save` and
  vote controls beyond what is listed were not assessed for contrast.
- No claim of WCAG or legal compliance is made for this application.

## Action Items for Acceptance

Barriers A1-A14 are static findings. Feature owners must assign them to
PWDRZ-28/158/159 or their respective feature tickets before remediation begins.

1. Execute [manual-test-script.md](manual-test-script.md) on Windows with
   Chromium and NVDA, record browser, NVDA and operating-system versions, and
   attach the filled copy to the acceptance record.
2. Confirm or retire each barrier using the observed results, and record any
   new barrier found during the manual run.
3. After assignment, remediate and re-run the affected steps of the script.
   Barriers that remain open are listed as unresolved in the final report.

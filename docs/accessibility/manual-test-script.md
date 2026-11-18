# Manual accessibility test script: NVDA and Chromium on Windows

This script is executed by a person. It confirms or retires the static findings
A1-A14 in [audit-sprint8.md](audit-sprint8.md). The expected results describe
what an application meeting the WCAG 2.2 AA engineering target should do. A
passing run does not establish whole-application WCAG or legal compliance.

## Session record

Fill in before starting.

| Field                                  | Value |
| -------------------------------------- | ----- |
| Tester                                 |       |
| Date                                   |       |
| Operating system and version           |       |
| Chromium (or Chrome) version           |       |
| NVDA version                           |       |
| NVDA speech viewer enabled (yes/no)    |       |
| Contrast tool and version              |       |
| Application source revision under test |       |
| Stack started with                     |       |

## Preconditions

- Start the stack from the repository root as described in the root
  [README](../../README.md) (for example `npm run dev`). The frontend must
  answer at `http://localhost:3001`.
- Use a synthetic account only. Do not use real credentials or production data.
- Have at least one published post. If none exists, create one in the
  create-post journey and note its slug (the part of the post URL after
  `/forum/`).
- Browser viewport widths to use: 320 px and 390 px. Set them with the Chromium
  device toolbar (custom size). Repeat each journey at both widths.
- Zoom check: set browser zoom to 200 percent with Ctrl and plus at a desktop
  window width of 1280 px.
- Use only the keyboard for every step unless a step says otherwise.
- Record NVDA speech by reading the speech viewer into the Observed column.

Result values for the Observed column: write what happened, then mark
Pass or Fail.

## Journey 1: Login

| Item            | Value                                           |
| --------------- | ----------------------------------------------- |
| Route           | `/login`                                        |
| URL             | `http://localhost:3001/login`                   |
| Viewports       | 320 px, 390 px, and 1280 px at 200 percent zoom |
| Browser version |                                                 |
| NVDA version    |                                                 |
| OS              |                                                 |

| Step | Action                                                                     | Expected                                                                                                                                                                         | Observed | Confirms |
| ---- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------- |
| 1.1  | Load the page. Press Tab once                                              | Focus lands on the first interactive element with a visible focus indicator. NVDA names the control and its role                                                                 |          | A12      |
| 1.2  | Press Tab until the Username field is focused                              | NVDA announces "Username" and "edit". Focus is visible                                                                                                                           |          |          |
| 1.3  | Leave both fields empty. Press Enter                                       | The form does not submit. An error for each empty field is shown and NVDA announces it without moving focus manually. Focus moves to the first invalid field or an error summary |          | A6       |
| 1.4  | Tab to the Password field with the error showing                           | NVDA reads the label and the field's error message with it (error tied to the field)                                                                                             |          | A6       |
| 1.5  | Inspect the error text colour with the contrast tool                       | Error text contrast of at least 4.5:1 against its background                                                                                                                     |          | A7       |
| 1.6  | Enter a valid username and a wrong password. Press Enter                   | NVDA announces the failure message automatically. Focus is placed so the user can correct the input                                                                              |          | A6       |
| 1.7  | Tab to "Forgot password?" and press Enter                                  | The link opens a working page. If it opens a not-found page, record Fail                                                                                                         |          | A8       |
| 1.8  | Press Browser Back. Tab to Google, GitHub and Discord. Press Enter on each | Each control starts a sign-in flow or is absent. A control that does nothing is a Fail                                                                                           |          | A9       |
| 1.9  | Enter valid credentials and press Enter                                    | Sign-in succeeds. NVDA announces the new page or a status message. Focus is in a sensible place                                                                                  |          |          |
| 1.10 | Repeat steps 1.1 to 1.3 at 320 px and at 390 px                            | No horizontal scrolling. All fields, labels and the submit button are fully visible and usable                                                                                   |          |          |
| 1.11 | Repeat at 200 percent zoom                                                 | No loss of content or function. No horizontal scrolling at 1280 px                                                                                                               |          |          |

## Journey 2: Create a post

| Item            | Value                                                      |
| --------------- | ---------------------------------------------------------- |
| Route           | `/forum` and `/`                                           |
| URL             | `http://localhost:3001/forum` and `http://localhost:3001/` |
| Viewports       | 320 px, 390 px, and 1280 px at 200 percent zoom            |
| Browser version |                                                            |
| NVDA version    |                                                            |
| OS              |                                                            |

Signed in as the synthetic account.

| Step | Action                                                                                   | Expected                                                                                                                           | Observed | Confirms |
| ---- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------- | -------- |
| 2.1  | On `/forum`, press Tab until "Create Post" is focused. Press Enter                       | The dialog opens. NVDA announces the dialog name ("Create a post") and role. Focus moves into the first field                      |          |          |
| 2.2  | Press Tab repeatedly through every control                                               | Focus stays inside the dialog and wraps from the last control to the first. Every control has a name and a visible focus indicator |          |          |
| 2.3  | Press Shift and Tab from the first control                                               | Focus wraps to the last control inside the dialog                                                                                  |          |          |
| 2.4  | Press Escape                                                                             | The dialog closes. Focus returns to the "Create Post" button. NVDA announces that button                                           |          |          |
| 2.5  | Reopen with Enter. Press Tab to the Close control and press Enter                        | The dialog closes and focus returns to "Create Post"                                                                               |          |          |
| 2.6  | Reopen. Tab to Cancel and press Enter                                                    | The dialog closes and focus returns to "Create Post"                                                                               |          |          |
| 2.7  | Reopen. Press Enter on the Publish button with all fields empty                          | The post is not sent. Each empty required field shows an error. NVDA announces the errors. Focus moves to the first invalid field  |          |          |
| 2.8  | Check each error text colour with the contrast tool                                      | At least 4.5:1 against its background                                                                                              |          | A7       |
| 2.9  | Fill Title, choose a Category, fill Body. Press Enter on Publish                         | The post is published. NVDA announces a status such as "Post published". A "View post" link is reachable by Tab                    |          |          |
| 2.10 | Press Enter on "View post"                                                               | The post page opens. The dialog is closed. Focus is at a sensible start position on the new page                                   |          | A2       |
| 2.11 | Repeat steps 2.1 to 2.9 at 320 px and at 390 px                                          | The dialog fits the viewport. Its content can be scrolled and every control reached without horizontal scrolling                   |          |          |
| 2.12 | Repeat at 200 percent zoom                                                               | No content or function is lost. The dialog remains operable                                                                        |          |          |
| 2.13 | Try to publish while signed out (open `/forum` in a fresh session and press Create Post) | The user is sent to the sign-in page. NVDA announces the page title                                                                |          |          |

## Journey 3: Feed

| Item            | Value                                                      |
| --------------- | ---------------------------------------------------------- |
| Route           | `/` and `/forum`                                           |
| URL             | `http://localhost:3001/` and `http://localhost:3001/forum` |
| Viewports       | 320 px, 390 px, and 1280 px at 200 percent zoom            |
| Browser version |                                                            |
| NVDA version    |                                                            |
| OS              |                                                            |

| Step | Action                                                                                                         | Expected                                                                                                                                             | Observed | Confirms |
| ---- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------- |
| 3.1  | Load `/`. Press Tab from the top of the page                                                                   | There is a way to skip repeated navigation, or the landmarks let NVDA jump to the main content. Open the NVDA elements list and record the landmarks |          | A12      |
| 3.2  | Tab to the Hot, New and Top tabs. Press Enter on New                                                           | NVDA announces which tab is selected (pressed or selected). The feed changes order or the control is absent                                          |          | A10      |
| 3.3  | Use NVDA heading navigation (key H) in the feed                                                                | Each post title is a heading. The page has one level 1 heading                                                                                       |          | A13      |
| 3.4  | Tab through one post card to the title                                                                         | The title is a link to the post. Pressing Enter opens `/forum/{slug}`. If no link exists, record Fail                                                |          | A1       |
| 3.5  | Tab to the Comments, Share and Save controls on a post card                                                    | Each control is reachable, or its unavailable state and reason are announced by NVDA without a mouse. Record what NVDA announces                     |          | A11      |
| 3.6  | Open `/forum`. Tab through the category filter and press Enter on a category                                   | NVDA announces the pressed state. The list updates. NVDA announces the change in results                                                             |          |          |
| 3.7  | Tab to "Next" in the pagination and press Enter                                                                | The page changes. NVDA announces the new page number from the live region. Focus stays on the control                                                |          |          |
| 3.8  | With the feed loading or failing, check the error and retry controls (disconnect the network, reload `/forum`) | NVDA announces the error. The "Try again" button is reachable and works                                                                              |          |          |
| 3.9  | Repeat steps 3.1 to 3.7 at 320 px and at 390 px                                                                | No horizontal scrolling. Post cards, tabs and pagination remain operable                                                                             |          |          |
| 3.10 | Repeat at 200 percent zoom                                                                                     | No loss of content or function                                                                                                                       |          |          |
| 3.11 | Check the contrast of the category badge, excerpt and meta text with the contrast tool                         | Text of at least 4.5:1, large text of at least 3:1                                                                                                   |          |          |

## Journey 4: Post detail

| Item            | Value                                                           |
| --------------- | --------------------------------------------------------------- |
| Route           | `/forum/[slug]`                                                 |
| URL             | `http://localhost:3001/forum/<slug>` (slug of a published post) |
| Viewports       | 320 px, 390 px, and 1280 px at 200 percent zoom                 |
| Browser version |                                                                 |
| NVDA version    |                                                                 |
| OS              |                                                                 |

| Step | Action                                                          | Expected                                                                                                                                                                   | Observed | Confirms |
| ---- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------- |
| 4.1  | Open the URL directly                                           | The page shows the post title and body. NVDA reads them. If only skeleton blocks and the slug are shown, record Fail                                                       |          | A2       |
| 4.2  | Press NVDA heading navigation (key H) from the top              | The first heading is a level 1 heading with the post title                                                                                                                 |          | A13      |
| 4.3  | Inspect the slug caption colour with the contrast tool          | At least 4.5:1 against its background                                                                                                                                      |          | A14      |
| 4.4  | Tab to the comment area while signed out                        | A sign-in prompt is reachable and named. NVDA announces it                                                                                                                 |          |          |
| 4.5  | Sign in, then open the comment form and submit an empty comment | An error is announced by NVDA and tied to the field. Record the observed behaviour. The comments API is provisional, so a failure to load comments is recorded, not scored |          |          |
| 4.6  | Repeat steps 4.1 to 4.3 at 320 px and at 390 px                 | No horizontal scrolling. Text is readable                                                                                                                                  |          |          |
| 4.7  | Repeat at 200 percent zoom                                      | No loss of content or function                                                                                                                                             |          |          |

## Journey 5: Dashboard

| Item            | Value                                           |
| --------------- | ----------------------------------------------- |
| Route           | `/dashboard` (requires sign-in)                 |
| URL             | `http://localhost:3001/dashboard`               |
| Viewports       | 320 px, 390 px, and 1280 px at 200 percent zoom |
| Browser version |                                                 |
| NVDA version    |                                                 |
| OS              |                                                 |

The dashboard currently shows mock data (PWDRZ-145). Record results against
what the page presents.

| Step | Action                                                                                | Expected                                                                                                                                         | Observed | Confirms |
| ---- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | -------- |
| 5.1  | Open the page. Use NVDA heading navigation (key H)                                    | Headings give a logical outline: one level 1 heading, then one heading per chart                                                                 |          | A13      |
| 5.2  | Move to each stat card with the NVDA browse mode down arrow                           | Label, value and change are read together. The change direction is conveyed in text (sign), not by colour                                        |          |          |
| 5.3  | Move to each chart with the NVDA browse mode down arrow and the Tab key               | Each chart has an accessible name and a text alternative. NVDA can read each value with its label. If NVDA skips the chart entirely, record Fail |          | A3       |
| 5.4  | Look for a data table or an equivalent control that lists the values by month or hour | A semantic table (with a caption, column headers and row headers) or equivalent lists the values. Navigate it with the NVDA table commands       |          | A3       |
| 5.5  | Using the keyboard only, find the value for a specific month, for example "Mar"       | The value is reached without a mouse. Record the keys used                                                                                       |          | A3       |
| 5.6  | Check that each series is distinguishable without colour (shape, pattern, label)      | Series are distinguishable by something other than colour alone. Record what is used                                                             |          |          |
| 5.7  | Measure chart line and bar colours against the card background with the contrast tool | At least 3:1 for graphical objects. Record each measured ratio                                                                                   |          | A4       |
| 5.8  | Measure axis label and stat text contrast                                             | Text of at least 4.5:1                                                                                                                           |          |          |
| 5.9  | Repeat steps 5.1 to 5.5 at 320 px and at 390 px                                       | No horizontal scrolling. Stat cards and charts fit without clipping. Record any clipped value or overflow                                        |          | A5       |
| 5.10 | Repeat at 200 percent zoom                                                            | No loss of content or function. Axis labels remain readable                                                                                      |          | A5       |

## Cross-cutting checks

Run once after the journeys and record the result.

| Check                   | Action                                                                                                                     | Expected                                                                            | Observed | Confirms    |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------- | ----------- |
| X.1 Focus return        | For every dialog or overlay used in the journeys, open it from the keyboard and close it by Escape, by Close and by Cancel | Focus always returns to the control that opened it, and NVDA announces that control |          |             |
| X.2 Reflow              | At 320 px and 390 px, scroll each route                                                                                    | No horizontal scrolling and no clipped or overlapping content                       |          | A5          |
| X.3 Zoom                | At 200 percent zoom, use each route                                                                                        | All content and functions remain available                                          |          | A5          |
| X.4 Contrast            | Measure every text colour used for errors, captions, placeholders and meta text                                            | Text at least 4.5:1. Graphical objects at least 3:1                                 |          | A4, A7, A14 |
| X.5 Error announcements | Trigger a validation error on the login form and the create-post form with NVDA running                                    | NVDA announces each error automatically, without the user searching for it          |          | A6          |
| X.6 Landmarks           | Open the NVDA elements list on each route                                                                                  | One main landmark per page and recognisable navigation landmarks                    |          | A12         |
| X.7 Page titles         | Move between routes and listen to the page title                                                                           | Each route has a distinct title announced on arrival                                |          |             |

## Outcome

| Field                         | Value |
| ----------------------------- | ----- |
| Barriers confirmed (IDs)      |       |
| Barriers not reproduced (IDs) |       |
| New barriers found            |       |
| Steps not executed and why    |       |
| Tester signature              |       |

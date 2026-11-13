# Synthetic analytics demo dataset

A known, varied forum history for exploring the analytics screens and for the defence (PWDRZ-187).
It is **synthetic**: every account, post, comment, vote and opening is invented, and it is meant
only for a dedicated demo database. It is separate from the small fixtures the E2E tests create.

| File                 | Purpose                                                                         |
| -------------------- | ------------------------------------------------------------------------------- |
| `load-demo-data.sql` | The loader. Replaces the forum content of the demo database in one transaction. |
| `oracle.mjs`         | Expected figures, computed independently of the SQL. Prints the tables below.   |
| `check.mjs`          | Compares a running instance with the oracle through the public API.             |

## What it contains

- **History:** 69 UTC days before the _anchor day_ (default: the UTC day you load it). The anchor
  day itself stays empty, so the figures do not depend on the time of loading. This covers two
  full 30-day windows.
- **Accounts:** 10 members (`demo_ana`, `demo_ben`, `demo_cleo`, `demo_dan`, `demo_eva`,
  `demo_finn`, `demo_gia`, `demo_hugo`, `demo_iris`, `demo_jon`) and the administrator
  `demo_admin`.
  - All accounts share the password `orbita-demo-only`, which exists only in this dataset.
  - E-mail addresses use the reserved domain `demo.orbita.invalid`.
- **Content:**
  - Posts in all seven default categories and without a category, with one to three of six tags.
  - Comments, votes and post openings.
  - Quiet days with no posts or comments: 9, 10, 11, 25, 41, 42 and 55 days before the anchor.
  - Peaks: 3 days before the anchor with 9 posts, 34 days before with 7, and two much-opened
    posts, `demo-3-0` and `demo-34-0`.
- **Controls:**
  - draft and deleted posts, which must never appear in public figures;
  - locked posts, which do count;
  - hidden and deleted comments, which do not count;
  - comments on hidden posts.
- **Labels:** display names end with `(synthetic)` and post titles start with `[Demo]`. Slugs
  are `demo-<days before anchor>-<n>`.
- **Counters:** consistent with the data, as the application keeps them: view, comment and vote
  counts, post counts per tag and per author.

## Safety

The loader changes nothing and exits with an error unless all of these hold:

1. The database name ends with `_demo`.
2. The same name is passed as `-v confirm=<name>`.
3. Flyway has migrated the database to V11 or later.
4. Every account in it has an `@demo.orbita.invalid` address.

Because of the last rule, the loader never deletes a real account. If someone registered during a
demo, reset by recreating the database (below).

## Load

1. Create an empty database whose name ends with `_demo` and start the backend on it once, so Flyway creates the schema.
2. Load the dataset.

With PostgreSQL on the host (16 or later):

```bash
createdb orbita_demo
# start the backend with SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/orbita_demo, then:
psql -d orbita_demo -v confirm=orbita_demo -f tools/demo-data/load-demo-data.sql
```

With Docker Compose, set `POSTGRES_DB=orbita_demo` in `.env` before the first `docker compose up`.
This is the database the backend migrates. Then:

```bash
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d orbita_demo -v confirm=orbita_demo < tools/demo-data/load-demo-data.sql
```

Add `-v anchor=2026-11-11` to place the history before another day.

The loader ends by printing the anchor day and the row counts. They must match the first table
below. Loading again gives the same content: everything except generated ids and the anchor
date is identical.

## Reset

Load again. Each load deletes the previous content, signed-in sessions included, and restores the
seven default categories as seeded. This also undoes category changes made by `demo_admin`.

If the loader refuses because of a non-synthetic account, drop and recreate the database. Start the
backend once, then load.

## Check

With the gateway running:

```bash
node tools/demo-data/check.mjs --base http://localhost:3000 --anchor 2026-11-11
```

Pass the anchor day used when loading (default: today in UTC). The script compares by calendar
date, so it also works on later days.

It checks:

- the 7- and 30-day public activity rows and totals;
- the number of public posts in the feed;
- the counters of the most opened posts;
- that draft and deleted controls stay hidden.

It exits with 1 on any mismatch.

## Expected figures

Printed by `node tools/demo-data/oracle.mjs`. Days count back from the anchor day (0). The rules
are those of the public activity: published and locked posts, visible comments on them.

| Rows   | Accounts | Posts | Comments | Votes | Openings |
| ------ | -------: | ----: | -------: | ----: | -------: |
| Loaded |       11 |   163 |      207 |   434 |      512 |

| Controls         | Count |
| ---------------- | ----: |
| Published posts  |   146 |
| Locked posts     |     6 |
| Draft posts      |     5 |
| Deleted posts    |     6 |
| Visible comments |   180 |
| Hidden comments  |    18 |
| Deleted comments |     9 |

| Window (UTC days, anchor day = 0) | Public posts | Visible comments on public posts |
| --------------------------------- | -----------: | -------------------------------: |
| Last 7 days (0-6)                 |           22 |                               25 |
| Last 30 days (0-29)               |           63 |                               76 |
| Previous 30 days (30-59)          |           66 |                               73 |

| Day before anchor | Public posts | Visible comments |
| ----------------: | -----------: | ---------------: |
|                 0 |            0 |                0 |
|                 1 |            4 |                5 |
|                 2 |            2 |                4 |
|                 3 |            8 |                6 |
|                 4 |            1 |                2 |
|                 5 |            4 |                4 |
|                 6 |            3 |                4 |
|                 7 |            2 |                2 |
|                 8 |            1 |                0 |
|                 9 |            0 |                0 |
|                10 |            0 |                0 |
|                11 |            0 |                0 |
|                12 |            1 |                2 |
|                13 |            4 |                4 |
|                14 |            3 |                4 |

| Category, last 30 days | Public posts |
| ---------------------- | -----------: |
| (uncategorized)        |            5 |
| ai                     |           11 |
| gaming                 |            6 |
| politics               |           10 |
| science                |            6 |
| business               |           10 |
| education              |            5 |
| news                   |           10 |

| Most opened posts | Openings (`viewCount`) |
| ----------------- | ---------------------: |
| `demo-3-0`        |                     40 |
| `demo-34-0`       |                     25 |
| `demo-3-1`        |                      5 |

Openings are measured from 00:00 UTC of the first synthetic day: the loader sets the collection start
in `analytics_collection_starts`, so an author's daily openings (`GET /api/analytics/me/posts/{id}/openings`)
show measured days, with 0 on quiet ones, across the whole history.

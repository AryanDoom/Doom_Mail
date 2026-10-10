# Coldmail frontend

Dashboard for email records sent through the Python API or CLI. The Cloudflare Worker records
opens when it is deployed and configured with the matching MongoDB settings.

Next.js 16 + TypeScript + Tailwind v4. No state library, no UI kit, no chart library.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run typecheck
npm run lint
```

---

## Backend API

`localstuff/api.py` serves the email API. The frontend sends and reads email records through
`NEXT_PUBLIC_API_BASE`; MongoDB and Gmail credentials stay in the Python backend.

| Route | What it does |
| --- | --- |
| `GET /emails` | Lists tracked emails, newest first |
| `GET /emails/{email_id}` | Returns one tracked email |
| `POST /emails` | Records, sends, then updates one email |

For local development, `frontend/.env.local` points at `http://localhost:8787`. Start the
backend from `localstuff` so it loads `localstuff/.env`, then start the frontend on port 3000.

The sample set is still available for layout work by setting `NEXT_PUBLIC_USE_MOCK=1` in
`frontend/.env.local`. Its fixed figures are 42 total / 31 sent / 18 opened / 13 unopened /
4 failed / 7 pending / 58.1% open rate.

The browser never talks to MongoDB and holds no credentials.

### Making the summary match `show.py`

`lib/summary.ts` reproduces the five `count_documents` calls in `show.py` exactly, including
the detail that `opened` only counts `status: "sent"` **and** `seen: true`. A pixel hit on an
email that later failed is deliberately not an open, so the dashboard and
`python show.py` will not disagree. If you change the arithmetic over there, change it here.

---

## Two things the schema cannot show

**First open.** `tracking.py` has no field for it and the worker does
`$set: { seen_at: new Date() }` on every hit, so `seen_at` only ever holds the *most recent*
open. The detail panel shows `FIRST OPEN: not recorded` rather than inventing one. Displaying
a real first open needs a `first_seen_at` written once when `seen` flips false to true.

**Campaigns.** Email records do not have a campaign field, so the app cannot group them into
campaigns yet. Contacts are read from `localstuff/contacts.csv` by the batch sender, and
runtime settings are kept in the backend environment.

---

## Environment

| Variable | Default | Meaning |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE` | unset | backend base URL. unset means the empty state |
| `NEXT_PUBLIC_USE_MOCK` | unset | `1` serves the sample set instead, for working on the layout |

---

## Layout notes

- No top bar. Navigation is the sidebar only, hidden by default, revealed by a 20px strip on
  the left edge on desktop, a 32px button under `md`. `Escape` closes it, and it is a real
  `<button>` so it opens from the keyboard.
- The drawer is 272px and fully opaque. It used to be 248px of `bg-shell/92` over
  `backdrop-blur-xl`, which is glassmorphism: it read as a floating translucent card, and the
  artwork showing through was the only thing keeping it from looking like a solid wall. The
  detail panel was the same treatment and is now opaque too. There is no `backdrop-filter` or
  `box-shadow` anywhere in the app.
- Content sits left of centre in a `max-w-[78rem]` shell so the artwork keeps the right side.
- Type is Inter throughout. Monospace is reserved for things that are actually code: env var
  names, file paths, endpoint routes and the raw SMTP error text. Nothing else.
- Section headings and field labels are 12px sentence case with almost no tracking, in blue
  (`#91a7c7`). The sidebar uses the same color. Numbers and body copy stay off-white.
- `public/main_back.jpg` is fixed behind everything with two flat layers over it: a
  `brightness(0.48)` filter on the bitmap and a `bg-black/42` overlay. It has to stay on a
  `body` that is transparent, because an opaque `body` background paints *over* a
  `z-index: -10` child in the root stacking context and hides the artwork completely.
- The artwork used to sit under three decorative gradients: a radial that opened up on the
  right, a top/bottom fade, and a vignette. That radial is precisely what kept the large
  characters on the right visible, and sampling the source showed why. It is 736x414, mean
  luma 19.9/255 with a pixel max of 186, not the ~8/63 the old comments claimed. On an 8x6
  grid the wave crest is in columns 1-3 of rows 1-3 (cell means 45/50/40) and the characters
  are in columns 6-7 of rows 2-4 (cell means 8-25). Flattening to one uniform knock down
  measures mean 4.8, p99 33, max 52, with the right-hand side now darker than the left.
- Text contrast was measured, not eyeballed, against the real painted background in each text
  element's own box: 0 elements under 4.5:1 at 1440x900, 1280x800, 834x1112, 390x844 and
  360x740, worst median 5.44:1 and worst single-pixel reading 4.08:1. Colours are read by
  resolving the computed value through a canvas, because Tailwind v4 emits `color-mix()` and
  `oklab()` for `/80`-style opacities and naive RGB parsing of those reads 0-1 floats as 0-255.
- Phones crop a 736x414 image to cover a tall viewport, which scales it about twice as much
  as desktop, so the bright crest of the wave lands larger on screen. There is one extra
  flat scrim below `md` to compensate.
- Collapsed menu sections fold with `grid-template-rows: 0fr` and `overflow: hidden`. That
  removes them visually but leaves them in the layout, so they also carry `inert`; without it
  those rows were invisible and still focusable.
- Status dots are desaturated on purpose. "Opened" is a display state derived from
  `status: "sent" && seen`, never something the backend stores.
- `error` strings are redacted client side before display: connection strings, credentials,
  addresses, IPs and long tokens are replaced. It is defence in depth for screenshots, not a
  security boundary. The real fix is not storing raw SMTP text in the first place.
- Background drift is 46 seconds and disabled under `prefers-reduced-motion: reduce`.

# CLAUDE.md — Drive Gallery

## Purpose

Drive Gallery is a self-hosted web app that runs as a single local Node process and lets you browse the photos on an attached external drive from any device on the same Wi-Fi — primarily a phone. You point it at a folder (`PHOTOS_ROOT`), start it, and open the printed LAN URL on your phone to browse folders and images with fast cached thumbnails and a full-screen viewer. No cloud, no upload, no account, no database.

- **Client:** Personal (Rodolfo Perez III)
- **Primary users:** The drive's owner, browsing their own photos from a phone/tablet on the same network. Non-technical at use time.
- **Core goal:** Serve an external drive's image folders to phones on the LAN, read-only, with good mobile thumbnails — zero cloud, zero file modification.

---

## Stack

| Layer | Technology | Version / Notes |
|-------|-----------|-----------------|
| Frontend | React + Vite | React 18, Vite 5, SPA built static and served by the API process |
| Backend / API | Node.js + Express | Node 20 LTS, Express 4 — reads the drive filesystem, streams images |
| Image processing | `sharp` | Thumbnail resize/transcode; HEIC via fallback if enabled |
| Database | None | Filesystem is the source of truth; thumbnails cached to disk |
| Auth | None by default | Trusted LAN; optional shared `ACCESS_TOKEN` |
| Styling | Tailwind CSS | v3, mobile-first |
| Package manager | npm | |
| Language | TypeScript | strict mode, shared types client↔server |

> **Why not Next.js:** the app needs runtime filesystem access + image streaming, which is incompatible with static export and heavier than needed under a full Next server. One Express process serving a built Vite SPA is the right size. (ADR-worthy — record it if revisited.)

---

## Structure

```
drive-gallery/
  src/
    server/
      index.ts             # Express bootstrap; binds HOST:PORT; prints LAN URL
      config.ts            # Reads + validates env
      routes/              # browse, thumb, image, health, culls
      lib/
        safePath.ts        # Resolve + contain a request path within PHOTOS_ROOT
        imageTypes.ts      # Allowed extensions + MIME
        thumbnailCache.ts  # Generate/lookup cached thumbnails (sharp)
        cullStore.ts       # Like/Maybe/No tags, persisted to CULL_FILE (outside the drive)
        listing.ts         # Read dir → folders[] + images[], skip hidden/system
    client/
      main.tsx, App.tsx
      pages/BrowsePage.tsx
      components/          # FolderGrid, Lightbox, Breadcrumb, DriveStatus
      lib/api.ts          # Typed fetch wrappers
    types/index.ts        # Shared DirListing, FolderEntry, ImageEntry
  public/                 # Client static assets
  .thumb-cache/           # Generated thumbnails (gitignored)
  scripts/apply-culls.ps1 # Copies tagged photos to <Dest>\<Liked|Maybe|No>\… (run by hand/Claude, never the server)
  .culls/                 # Cull manifest (gitignored)
  tests/                  # Vitest + Supertest; path-containment tests
  .env.example
  vite.config.ts
```

*(Keep this in sync with the actual repo.)*

---

## Conventions

### Git
- Branch naming: `feat|fix|chore/<short-description>`
- PRs target: `main`
- Commit style: conventional commits

### Code Style
- TypeScript strict — `tsc --noEmit` must pass for both client and server. No `any`; use `unknown` + type guards.
- Tailwind utility classes, mobile-first — base classes for phone, `sm:`/`md:` for larger.
- Shared wire types live in `src/types/` — never redefine them per side.

### Naming
- Components: `PascalCase`. Hooks: `useCamelCase`. Utilities: `camelCase`.
- Files: `camelCase` for lib/server modules, `PascalCase` for React components.
- API routes: lowercase nouns under `/api`.

### Testing
- Unit + API: Vitest (+ Supertest for routes) — `npm test`.
- Every business rule in the spec must have at least one test.
- Path containment must have explicit escape-attempt tests (`..`, absolute paths, symlinks).

---

## Key Integrations

| Integration | Purpose | Notes |
|-------------|---------|-------|
| Local filesystem (`PHOTOS_ROOT`) | The photo source | **Read-only.** Every access goes through `safePath.ts`. |
| `sharp` | Thumbnails + transcoding | Writes only to `THUMB_CACHE_DIR`, never to the drive. |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PHOTOS_ROOT` | Yes | Absolute path to the drive folder to browse. Server refuses to start if unset/unreadable. |
| `PORT` | No | Listen port. Default `8080`. |
| `HOST` | No | Bind interface. Default `0.0.0.0` (required for phone access). |
| `THUMB_CACHE_DIR` | No | Thumbnail cache location. Default `./.thumb-cache`. Must NOT be inside `PHOTOS_ROOT`. |
| `CULL_FILE` | No | Cull manifest (Like/Maybe/No tags). Default `./.culls/culls.json`. Must NOT be inside `PHOTOS_ROOT`. |
| `THUMB_MAX_WIDTH` | No | Thumbnail width px. Default `400`. |
| `ACCESS_TOKEN` | No | Shared secret. Set → gates all routes; unset → open on the LAN. |

Copy `.env.example` → `.env.local`. Never commit `.env.local`.

---

## How to Engage

1. **Path safety is the first rule, always.** Every filesystem access must go through `src/server/lib/safePath.ts`. Never read a path built by concatenating a query param directly. A path that escapes `PHOTOS_ROOT` is a `403`, not a stat.
2. **Never write to the drive.** No route may open a file under `PHOTOS_ROOT` for writing, ever. The only writes the app makes are thumbnails in `THUMB_CACHE_DIR` and the cull manifest at `CULL_FILE` — both outside the drive. Copying picks is done by `scripts/apply-culls.ps1`, never by the server.
3. **Bind `0.0.0.0` and advertise the URL.** The point of this app is phone access — don't bind `localhost`, and keep the startup LAN-URL print working.
4. **Degrade gracefully when the drive is gone.** Unreadable `PHOTOS_ROOT` → `503 DRIVE_UNAVAILABLE` and a UI banner, never a crash or a hang.
5. **Mobile-first, test at 375px.** The primary client is a phone. Lazy-load the grid; don't fetch 1,000 thumbnails at once.
6. **API response shape is fixed.** Data routes return `{ data }`; errors `{ error: { code, message } }`. Image/thumb routes are the only ones returning raw bytes.
7. **Surface gaps proactively.** Open items live in `project-spec.md` → Gaps & Questions (HEIC, sort order, token, video, host OS). Flag, don't silently guess.
8. **For "current best practice" questions** — use WebSearch; training knowledge lags on tooling.

---

## What Doesn't Belong Here

- Cloud upload, sync, or any external storage — this app is deliberately local-only.
- A database or CMS — the filesystem is the source of truth.
- User accounts, roles, or real auth — at most a single shared token.
- Write operations on the drive (rename/delete/edit/organize) — read-only by design.
- Credentials or `.env` values — never commit.

---

## References

- [Project Spec](project-spec.md) — data model, routes, business rules, acceptance criteria
- ADR (to write) — "Express + Vite over Next.js for a local filesystem image browser"

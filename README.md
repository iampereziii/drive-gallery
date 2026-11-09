# Drive Gallery

Browse the photos on an attached external drive from any phone on the same Wi-Fi.
Local-only, read-only, no cloud, no accounts, no database.

- **Server:** Node 20 + Express (reads the drive filesystem, streams images, caches thumbnails)
- **Client:** React + Vite + Tailwind SPA (served by the same process in production)
- **Images:** JPG / PNG / WebP / GIF / BMP / TIFF (no HEIC, no video in v1)

## Quick start

```bash
npm install
cp .env.example .env       # then edit PHOTOS_ROOT to your drive folder, e.g. E:\Photos
npm run dev
```

`npm run dev` runs the API (`:8080`) and the Vite dev server (`:5173`). Open the
**Network** URL printed in the terminal on your phone — both the laptop and phone
must be on the same Wi-Fi.

## Production (single process)

```bash
npm run build      # builds the SPA into dist/client
npm start          # Express serves the SPA + API on http://<lan-ip>:8080
```

On startup the server prints the LAN URL to open on your phone.

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PHOTOS_ROOT` | Yes | — | Absolute path to the drive folder to browse (e.g. `E:\Photos`). |
| `PORT` | No | `8080` | Port to listen on. |
| `HOST` | No | `0.0.0.0` | Bind interface — keep `0.0.0.0` for phone access. |
| `THUMB_CACHE_DIR` | No | `.thumb-cache` | Thumbnail cache. Must be outside `PHOTOS_ROOT`. |
| `THUMB_MAX_WIDTH` | No | `400` | Thumbnail width in pixels. |
| `CULL_FILE` | No | `.culls/culls.json` | Where your Like/Maybe/No tags are saved. Must be outside `PHOTOS_ROOT`. |

## Scripts

| Script | What it does |
|--------|--------------|
| `npm run dev` | API + client with hot reload |
| `npm run build` | Build the SPA into `dist/client` |
| `npm start` | Run the production server (serves built SPA + API) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest (path-containment + API tests) |

## Narrowing down photos (culling)

1. Open a photo. Tap **No**, **Maybe** or **Like** in the bottom bar (keys `1` `2` `3` on desktop).
   The tag flashes and the viewer moves to the next photo. Tap the active tag again to clear it.
2. In a folder, use the filter chips (**To review / Liked / Maybe / No**) for a second pass, e.g. go back
   through just the Maybes. Tags are saved on the host, so they survive reloads and show on every device.
   To trim your Likes, tap **♥ N liked ›** at the top: **All Likes** shows every Like from every folder in one
   grid, and the ♥ count (also shown in the viewer) drops live as you tag photos No. Tap the big ♥ count there
   to set a **goal** (e.g. 300): it shows as **♥ 412 / 300** everywhere, amber until you're at or under it.
   The goal is saved on the host with your tags.
   While judging, a **thumbnail strip** shows the photos around the current one (a row above the tag bar on an
   upright phone, a column on the left when sideways or on a wider screen). Tap one to jump to it; the grid
   button in the viewer's top bar hides or shows it. The **S / M / L** button next to it changes the thumbnail
   size: **L** (the default) is a ~320px judging column on a laptop, showing each whole photo uncropped so you
   can compare eyes, focus and framing. The next ~20 thumbnails are prepared in the background as you go.
3. When you are done, copy your picks off the drive. The app itself never touches the photos:

```powershell
powershell -ExecutionPolicy Bypass -File scriptsapply-culls.ps1 -Dest E:Picks -Tags Like,Maybe -WhatIf   # dry run
powershell -ExecutionPolicy Bypass -File scriptsapply-culls.ps1 -Dest E:Picks -Tags Like,Maybe          # copy
```

Photos are copied to `E:PicksLiked<original folders>…` and `E:PicksMaybe…`. Originals stay where
they are, and re-running skips files that are already copied.

## Notes

- **Read-only:** the app never modifies the drive. The only writes go to the
  thumbnail cache and the cull manifest, both outside `PHOTOS_ROOT`.
- **Open on the LAN:** v1 has no authentication — anyone who can reach the host
  and port can browse. Intended for a trusted home network.
- See [project-spec.md](../ais/projects/drive-gallery/project-spec.md) for the full spec and business rules.

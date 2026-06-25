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

## Scripts

| Script | What it does |
|--------|--------------|
| `npm run dev` | API + client with hot reload |
| `npm run build` | Build the SPA into `dist/client` |
| `npm start` | Run the production server (serves built SPA + API) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest (path-containment + API tests) |

## Notes

- **Read-only:** the app never modifies the drive. The only writes go to the
  thumbnail cache, which lives outside `PHOTOS_ROOT`.
- **Open on the LAN:** v1 has no authentication — anyone who can reach the host
  and port can browse. Intended for a trusted home network.
- See [project-spec.md](../ais/projects/drive-gallery/project-spec.md) for the full spec and business rules.

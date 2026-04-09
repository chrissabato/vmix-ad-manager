# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A single-page web app for managing and scheduling video ads in vMix (broadcast production software). It runs as a PHP + vanilla JS app on a web server co-located with or accessible from the vMix machine.

## Architecture

Three files make up the entire app:

- **`index.html`** — Static UI only. Uses Tailwind CSS via CDN. No build step. All logic is in `app.js`.
- **`app.js`** — Single `App` object with all state and methods. Persists settings and video library to `localStorage`. Communicates with vMix via `api.php`.
- **`api.php`** — CORS proxy. The browser calls this; it proxies requests to the vMix Web Controller HTTP API (`http://<ip>:<port>/api/`). Uses cURL with fallback to `file_get_contents`.

## How It Works

### vMix Communication
- vMix exposes a Web Controller at `http://<ip>:8088/api/`
- API calls use query params: `?Function=ListAdd&Input=<name>&Value=<path>`
- To read playlist state, a GET with no `Function` param returns full XML state
- `api.php` wraps responses as `{ success, response, httpCode, url }`
- The PHP proxy is optional — toggle with the "Use PHP proxy (CORS)" checkbox

### Ad Selection
- Each video has a `priority` (1=Low, 2=Medium, 3=High)
- `generateWeightedSelection(count)` picks ads proportional to priority weight
- Each ad is assumed to be 30 seconds; durations map to slot counts (e.g. 2 min = 4 ads)

### Key vMix API Functions Used
- `ListAdd` — add a video file to a playlist input (Value = full file path)
- `ListRemove` — remove item at a given index (1-based)
- `SelectAll` + `ListRemoveSelected` — clear entire playlist
- `getState=1` (no Function param) — fetch full XML state to read playlist contents and playback status

### State & UI Flow
1. User configures vMix IP, port, input name, and folder path in Settings
2. Videos added to library (stored in `localStorage`)
3. In the dashboard: select duration → preview playlist is generated → REPLACE or APPEND sends it to vMix
4. Current vMix playlist auto-refreshes every 2s; shows playback state (Playing/Paused) and On Air / Off Air indicator

## Deployment

Deploy all files to a PHP-capable web server (Apache with mod_rewrite). The `.htaccess` disables directory listing and sets caching headers. No dependencies to install, no build step.

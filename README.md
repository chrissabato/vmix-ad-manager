# vMix Ad Manager

A web app for managing and scheduling video ads in [vMix](https://www.vmix.com/) broadcast production software. Configure your ad library, generate weighted playlists by duration, and send them directly to a vMix playlist input — from any browser on your network.

## Features

- Multiple vMix setups (profiles) saved server-side, shared across browsers
- Weighted ad selection by priority (Low / Medium / High)
- Avoids back-to-back repeats of the same ad
- Preview and manually reorder playlists before sending
- Quick-send buttons to replace the playlist in one click
- Live vMix playlist view with playback and on-air status (auto-refreshes every 2s)
- HTTP API to replace the playlist programmatically (e.g. from a Stream Deck or automation script)

## Requirements

- PHP-capable web server (Apache with `mod_rewrite`) — co-located with or network-accessible from the vMix machine
- vMix Web Controller enabled (`Settings → Web Controller`)
- The `data/` directory must be writable by the web server user

## Installation

1. Copy all files to a directory on your web server.
2. Make the `data/` directory writable:

```bash
mkdir -p data
chown apache:apache data   # RHEL/CentOS
chmod 755 data

# If SELinux is enabled (RHEL):
chcon -t httpd_sys_rw_content_t data
# To make it permanent:
semanage fcontext -a -t httpd_sys_rw_content_t "/path/to/vmix-ad-manager/data(/.*)?"
restorecon -Rv data
```

3. Open the app in a browser, configure a setup under **Settings**, and click **Save Settings**.

## Usage

### Settings

Configure one or more vMix setups using the **Setup** dropdown at the top of the Settings panel. Each setup stores:

- vMix IP address and port (default `8088`)
- vMix input name (the playlist input in vMix, e.g. `Playlist 1`)
- Video folder path (the folder on the vMix machine, e.g. `C:\Videos\Ads\`)

Setups are stored server-side and shared across all browsers. The active setup selection is per-browser.

### Video Library

Add `.mp4` files by filename (file browser, manual entry, or bulk paste). Each video gets a priority:

| Priority | Weight |
|----------|--------|
| Low      | 1×     |
| Medium   | 2×     |
| High     | 3×     |

### Playout Dashboard

- **Select Duration** — click a duration to generate a preview playlist
- **Quick-send (▶)** — immediately replace the vMix playlist without previewing
- **Playlist Preview** — drag to reorder, then click **REPLACE** or **APPEND**
- **vMix Playlist** — live view of the current vMix playlist with playback state

### Playlist API

Replace the vMix playlist via HTTP GET — useful for Stream Decks, automation scripts, or broadcast triggers:

```
GET /playlist.php?count=2
GET /playlist.php?count=4&profile=studio-a
```

| Parameter | Description |
|-----------|-------------|
| `count`   | Number of ads to load (required) |
| `profile` | Profile ID or name (optional, defaults to first profile) |

The exact URL for the active profile is shown in the **Playlist API** panel of the config section.

**Response:**
```json
{
  "success": true,
  "profile": "Studio A",
  "count": 4,
  "playlist": ["ad1.mp4", "ad2.mp4", "ad3.mp4", "ad4.mp4"]
}
```

## File Structure

```
index.html      Static UI (Tailwind CSS via CDN)
app.js          All client-side logic and state
api.php         CORS proxy for vMix Web Controller API calls
playlist.php    Playlist replacement API endpoint
save.php        Saves profiles and video library to server-side JSON
load.php        Loads profiles and video library on page init
data/           Server-side storage (profiles.json, videos.json)
```

# YouTube Thumbnail Downloader Pro

## Overview
A web-based utility that allows users to fetch and download thumbnails from YouTube videos in various qualities (up to 4K). Supports bulk processing, individual downloads, and downloading multiple thumbnails as a ZIP archive.

## Tech Stack
- **Frontend**: Pure HTML5, CSS3, and Vanilla JavaScript (ES6+) — single `index.html` file
- **Libraries (CDN)**: JSZip v3.10.0, FileSaver.js v2.0.5
- **External APIs**: noembed.com (video titles), img.youtube.com (thumbnails)
- **Build System**: None (no-build static site)

## Project Structure
```
index.html        # Entire application (HTML + CSS + JS)
```

## Running the App
The app is served using Python's built-in HTTP server on port 5000:
```
python3 -m http.server 5000 --bind 0.0.0.0
```

## Deployment
Configured as a **static** deployment with `publicDir: "."`.

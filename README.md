<div align="center">
  <h1>andalagy</h1>
  <img src="https://img.shields.io/github/last-commit/andalagy/film-site" alt="Last Commit">
  <img src="https://img.shields.io/github/license/andalagy/film-site?label=license" alt="License">
  <img src="https://img.shields.io/badge/made%20by-andalagy-black" alt="By andalagy">
</div>

---

A starter film site for andalagy that already knows it will expire, built to feel certain for a moment and then quietly fall behind. The recommendations arrive with confidence, the lists pretending to be fixed, even as new releases stack up and old opinions start to slip. Nothing is meant to last for long; taste shifts, context changes, relevance erodes.

## Optional YouTube Data API setup

If you want embeddable detection to use YouTube Data API v3 first (before iframe probing), inject a runtime key as:

- `window.FILM_SITE_CONFIG = { youtubeApiKey: 'YOUR_KEY' }`

This value should come from your deployment environment variable (for example `YOUTUBE_DATA_API_KEY`) and must never be hardcoded in `script.js`.

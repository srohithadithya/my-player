# AuraPlay 🎵

> A premium, ad-free music streaming platform with native Android support.

## Tech Stack

| Layer     | Technology                        |
| --------- | --------------------------------- |
| Frontend  | React 19 + Vite 8                 |
| Styling   | Custom CSS (Glassmorphism)        |
| Backend   | Node.js + Express (on Render)     |
| Mobile    | Capacitor 8 (Android APK)        |
| API       | JioSaavn Proxy (saavn.sumit.co)   |

## Features

- 🔍 **Unified Search** — Songs, Albums, Artists, Playlists
- 🎵 **Album & Artist Detail Views** — Tap any album/artist to see full track listings
- 📥 **Offline Downloads** — Native filesystem storage via Capacitor
- 🤖 **ML Recommendations** — Content-based filtering from listening history
- 📋 **Playlist Import** — Spotify, YouTube, JioSaavn URL import
- ☁️ **Cloud Sync** — Google One & OneDrive integration scaffold
- 🚗 **Driving Mode** — Simplified UI for safe driving
- ⚕️ **Health Warnings** — Auto-alert after 2h continuous listening
- 👥 **Multi-Profile** — Switch between user profiles

## Project Structure

```
my-player/
├── backend/              # Express API server (deployed on Render)
│   ├── server.js         # All API routes
│   └── package.json
├── src/                  # React frontend
│   ├── App.jsx           # Main application component
│   ├── App.css           # Component styles
│   ├── index.css         # Design tokens & utilities
│   └── main.jsx          # React entry point
├── android/              # Capacitor Android project
├── public/               # Static assets
├── index.html            # HTML entry
├── capacitor.config.json # Capacitor config
├── vite.config.js        # Vite config
└── package.json          # Frontend dependencies
```

## Development

```bash
# Install dependencies
npm install

# Run frontend dev server
npm run dev

# Build for production
npm run build

# Build Android APK
npm run build
npx cap sync
cd android && ./gradlew assembleDebug
```

## API Endpoints

| Method | Route                      | Description                    |
| ------ | -------------------------- | ------------------------------ |
| GET    | `/api/search/songs`        | Search songs by query          |
| GET    | `/api/search/albums`       | Search albums by query         |
| GET    | `/api/search/artists`      | Search artists by query        |
| GET    | `/api/search/playlists`    | Search playlists by query      |
| GET    | `/api/albums/:id`          | Get album details + tracks     |
| GET    | `/api/artists/:id`         | Get artist details + top songs |
| GET    | `/api/artists/:id/songs`   | Get artist songs (paginated)   |
| POST   | `/api/recommend`           | ML-based song recommendations  |
| POST   | `/api/playlist/import`     | Import external playlists      |
| POST   | `/api/cloud/sync`          | Cloud storage sync             |

## Deployment

- **Frontend**: Deployed via Render (static site from `dist/`)
- **Backend**: Deployed via Render (Node.js service from `backend/`)
- **Production URL**: https://auraplay.onrender.com

## License

MIT © AuraPlay

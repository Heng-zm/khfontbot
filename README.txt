# Font Bot (Telegram) — Admin Panel + Font Browser

A Telegram bot that lets users browse and download fonts, with an Admin Panel (HTTP + WebSocket) to moderate uploads, broadcast messages, view logs, and manage users.

## Features
- Browse fonts with previews and metadata (TrueType/OpenType)
- Inline mode with cached file_ids for snappy results
- Admin Panel (Express + WebSocket):
  - Live logs
  - Pending font approvals/rejections
  - User search, ban/unban
  - Broadcast message composer with live progress
- Robust text rendering using node-canvas with a Khmer fallback font
- LowDB JSON storage for users, bans, queue, and simple stats

## Requirements
- Node.js 18+
- Build prerequisites for node-canvas (on Windows/macOS/Linux per node-canvas docs)
- A Telegram bot token

## Quick start
1) Install dependencies
```
npm install
```

2) Create a .env file
```
TELEGRAM_BOT_TOKEN=123456:ABC-YourBotToken
ADMIN_CHAT_ID=123456789
FONT_DIRECTORY=C:\\path\\to\\your\\fonts
ADMIN_PANEL_PORT=3000
# Optional
BROADCAST_DELAY_MS=300
```

3) Start the bot
- Direct
```
node index.js
```
- With PM2 (recommended)
```
pm2 start index.js --name index
pm2 logs
```
Admin Panel: http://localhost:3000 (default)

## Directory layout
- index.js — bot bootstrap and polling
- adminPanel.js — Admin Panel (HTTP + WebSocket)
- handlers/ — message/callback/inline/admin command handlers
- services/
  - logger.js — winston logger (writes combined.log and error.log)
  - dbService.js — LowDB abstraction
  - fontService.js — font cache and user sessions
  - imageService.js — preview generation (node-canvas)
  - fontMetaService.js — metadata with opentype.js
- ui/fontList.js — paginated font list utilities
- assets/KhmerOSSiemreap-Regular.ttf — fallback font used by canvas
- pending_fonts/ — user-submitted fonts awaiting approval (created at runtime)
- admin.html — Admin Panel UI

## Admin Panel endpoints
- GET /api/data — dashboard data (stats, pending, logs)
- GET /api/broadcast/status — last broadcast status
- GET /api/users?search= — users with optional search
- GET /api/user/:id — single user + ban status
- POST /api/message — { userId, message }
- POST /api/broadcast — { message }
- POST /api/ban — { userId, reason }
- POST /api/unban — { userId }
- POST /api/approve — { fileName }
- POST /api/reject — { fileName }

## Notes and tips
- Fonts directory
  - Set FONT_DIRECTORY to your .ttf/.otf folder. Admin approvals move files from pending_fonts to FONT_DIRECTORY.
- Rendering
  - A Khmer fallback font is bundled; previews will attempt to register the target font and fall back gracefully.
- Safety on restarts
  - On startup we delete any webhook and start polling to avoid conflicts.
  - SIGINT/SIGTERM handlers stop polling cleanly.

## Troubleshooting
- 409 Conflict (ETELEGRAM: terminated by other getUpdates request)
  - Ensure only one bot instance is polling per token.
  - With PM2, check `pm2 list`; keep a single instance for long polling.
  - If another host is running with the same token, stop it or rotate the token.
- Pango-CRITICAL / canvas warnings
  - Ensure your fonts are valid; the app registers a fallback. Verify node-canvas prerequisites are installed.
- Buffer filename deprecation warnings (node-telegram-bot-api)
  - Addressed by passing filenames for Buffer uploads.
- Admin Panel JS error at (index):373
  - Fixed escapeHTML and added renderStats; reload the page.

## Logging
- combined.log — all levels
- error.log — errors only
- exceptions.log — uncaught exceptions

## Security
- Keep .env out of version control.
- Treat db.json as runtime data (ignored by default).

## License
ISC

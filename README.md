# Maya — AI Executive Assistant (Voice + Visual + Text)

Maya is a voice‑first executive assistant built on Google’s Gemini Live API. It supports **real‑time voice**, **camera input**, and **seamless fall‑back to text chat** while keeping the same conversation state. A dynamic **Canvas** renders JIT cards (email drafts, market pulse, dossiers, strategy memos, charts, etc.) either as overlays in voice mode or inline inside the chat transcript in text mode.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Stack](https://img.shields.io/badge/stack-Google%20GenAI-orange.svg)
![React](https://img.shields.io/badge/framework-React%2019-blue.svg)

---

## ✨ Highlights

- **Gemini Live voice**: low‑latency audio with turn detection.
- **Camera grounding**: periodic image frames during voice sessions.
- **Text mode continuity**: switch to `/text` and see the same session as a transcript + inline cards.
- **Canvas JIT UI**: rich cards for email, calendar, market data, dossiers, memos, etc.
- **Multi‑persona**: Maya / Atlas / Nova / Zorra with distinct instructions and voices.
- **Telemetry hooks**: structured client‑side tracking for debugging and reliability.

---

## 🧠 How It Works (High‑Level)

### 1) Live session (audio + tools)
- Connects to Gemini Live via `@google/genai`.
- Streams **PCM 16kHz** mic audio in real time.
- Receives **24kHz** PCM audio from Gemini, decodes and plays it back.
- Optionally streams camera frames for visual grounding.

### 2) Text mode continuity
- All voice turns are transcribed server‑side.
- Transcripts are **stored in client state** and displayed only in `/text` mode.
- Text turns are sent via `sendClientContent` and appended to the same Live session.

### 3) Canvas JIT UI
- Tool calls (email, calendar, market pulse, dossiers, etc.) render Canvas items.
- In **voice mode**, Canvas appears as overlays.
- In **text mode**, Canvas appears inline in the chat transcript.

---

## 🧱 Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind via CDN (`index.html`) + custom glassmorphism styling
- **AI**: Google Gemini Live API (`@google/genai`)
- **Icons**: lucide-react
- **Testing**: Node built‑in test runner (`node --test`)

> This repo is **frontend‑only**. Tool actions are currently mocked in `services/tools.ts` for UX/flow testing.

---

## 🗂️ Project Structure

```
/
├── App.tsx                 # Main application + Live session wiring
├── components/             # UI components (Canvas, TextChat, Settings, etc.)
├── services/               # Tool declarations + mock data
├── utils/                  # Routing + telemetry helpers
├── constants.ts            # Personas, model config, system instructions
├── types.ts                # Shared types
├── tests/                  # Node test files
├── index.html              # Tailwind CDN + entry
├── vite.config.ts          # Vite dev server config
└── package.json
```

---

## ✅ Requirements

- Node.js 20+
- Google Gemini API key

---

## 🔐 Environment Variables

Vite maps these into the frontend:

```
GEMINI_API_KEY=your_key_here
```

The app consumes:
- `process.env.API_KEY`
- `process.env.GEMINI_API_KEY`

Both are set from `GEMINI_API_KEY` in `vite.config.ts`.

---

## ▶️ Running Locally

```bash
npm install
npm run dev
```

Open:
- `http://localhost:5173` (or the port printed by Vite)

---

## ▶️ Running on Replit (Important)

Vite must bind to **0.0.0.0** and **$PORT**.

**Run command**:
```bash
npm run dev -- --host 0.0.0.0 --port $PORT
```

**Vite config (already included)**:
- `host: true`
- `port: Number(process.env.PORT) || 5000`
- `strictPort: true`
- `allowedHosts: true` (required for Replit proxy)

If you see `PAGE_UNREACHABLE` or host block errors, make sure the Replit workflow is using the command above and that Vite is not running on `127.0.0.1`.

---

## 🧪 Tests & Checks

```bash
npm run typecheck
npm test
```

- `npm test` runs the Node test suite in `tests/`.

---

## 🧭 Modes & Routing

- **Voice Mode**: `/`
  - Live voice, Canvas overlays, no transcript UI.
- **Text Mode**: `/text`
  - Live text + transcripts + inline Canvas cards.

> There is no router dependency. Routing uses `history.pushState` + `popstate`.

---

## 🛠️ Telemetry & Debugging

A lightweight client tracker lives in `utils/telemetry.js`.
It stores recent events (200 max) at:

```
window.__mayaTelemetry
```

Events include:
- session connect/disconnect
- tool execution
- transcription completion
- audio/mic start/stop
- routing changes

---

## 🔧 Troubleshooting

### Text not responding
- Ensure the session is connected.
- Confirm the Live model supports `Modality.TEXT`.
- Check console for `text_send_error` telemetry.

### Replit host blocked
- Confirm `allowedHosts: true` in `vite.config.ts`.
- Restart the dev server after changes.

### Audio issues
- Make sure your browser allows mic access.
- iOS Safari requires user interaction to unlock audio contexts.

---

## ⚠️ Known Limitations

- Tool actions are **mocked** (see `services/tools.ts`) and do not hit real backends yet.
- No server‑side persistence in this repo; transcript/history lives in client state.
- `/text` requires SPA routing support (history fallback) when deployed.

---

## 🚀 Deployment

### Static hosting (Vercel/Netlify/Cloudflare Pages)
- Build: `npm run build`
- Serve `dist/` as a static site.
- Add **SPA fallback** so `/text` routes to `index.html`.

### Example SPA fallback config
- **Netlify**: `_redirects` with `/* /index.html 200`
- **Vercel**: `rewrites` to `/index.html`
- **Cloudflare Pages**: `_routes.json` or “Single‑Page App” setting

---

## 📄 License

MIT — see LICENSE.

---

*Built with ❤️ using Google Gemini Live API.*

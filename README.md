# Maya — Revolutionary AI Executive Assistant

Maya is a state-of-the-art, voice-first AI executive assistant designed to streamline your high-performance workflow. Built on a cutting-edge Google tech stack, Maya leverages the power of Gemini 2.5 and 3.0 series models to provide a seamless, proactive, and visually intelligent companion for modern leaders.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Stack](https://img.shields.io/badge/stack-Google%20GenAI-orange.svg)
![React](https://img.shields.io/badge/framework-React%2019-blue.svg)

## 🌟 Vision
In a world of information overload, Maya acts as your digital chief of staff. She doesn't just answer questions; she anticipates needs, prepares dossiers for your meetings, monitors market pulses, and drafts strategic memos from your spoken thoughts.

## 🚀 Key Features

### 🎙️ Voice-First Interaction (Gemini Live)
Engage in low-latency, natural conversations. Maya listens, thinks, and speaks with human-like prosody, allowing for hands-free productivity while you drive, walk, or work.

### 👁️ Visual Intelligence
With integrated camera support, Maya can see what you see. Show her a printed chart, a prototype, or a whiteboard session, and she will provide instant analysis and documentation.

### 🖼️ Intelligent Canvas
Instead of a static chat history, Maya uses a dynamic **Canvas** to display:
- **Live Deal Dossiers**: Instant intelligence on companies and people before meetings.
- **Market Pulse**: Real-time financial tickers and performance sparklines.
- **Strategy Memos**: Automated debriefs from your meetings into Risks, Decisions, and Action Items.
- **Email & Calendar**: Seamlessly manage your schedule and correspondence with proactive drafting.

### 🎭 Multi-Persona Architecture
Choose the partner that matches your current goal:
- **Maya**: The creative collaborator.
- **Atlas**: The precise, strategic operator.
- **Nova**: The high-energy execution specialist.
- **Zorra**: The empathetic "bestie" and executive partner.

## 💻 Tech Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS (Glassmorphism UI)
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: Google Gemini API (`@google/genai`)
- **Logging**: Pino with structured logging

---

## 🛠️ Development Setup

### Prerequisites
- Node.js 20+ 
- PostgreSQL database (local or cloud)
- Google Gemini API key

### Environment Variables

Create a `.env` file in the project root:

```bash
# Required
GEMINI_API_KEY=your_gemini_api_key_here
DATABASE_URL=postgresql://user:password@localhost:5432/maya

# Optional (defaults shown)
PORT=3001
NODE_ENV=development
```

### Local Development

```bash
# 1. Install dependencies
npm install

# 2. Set up your environment variables
cp .env.example .env
# Edit .env with your values

# 3. Push database schema
npm run db:migrate

# 4. Start development servers
npm run dev
```

This starts:
- **Frontend**: http://localhost:5000 (Vite dev server)
- **Backend API**: http://localhost:3001

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start both frontend and backend in development mode |
| `npm run dev:frontend` | Start only the Vite frontend server |
| `npm run dev:server` | Start only the Express backend server |
| `npm run build` | Build frontend for production |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run db:migrate` | Push schema changes to database |
| `npm run db:studio` | Open Drizzle Studio to browse database |

---

## 🏗️ Project Structure

```
/
├── App.tsx                  # Main React application entry
├── components/              # React UI components
├── constants.ts             # App configuration and personas
├── services/                # Frontend services (tools, API calls)
├── types.ts                 # TypeScript type definitions
├── utils/                   # Frontend utilities (routing, telemetry)
├── server/
│   └── src/
│       ├── index.ts         # Express server entry point
│       ├── db/              # Database schema and connection
│       ├── middleware/      # Request logging, error handling
│       ├── routes/          # API endpoints
│       ├── services/        # Backend services (log persistence)
│       └── utils/           # Logger, helpers
├── vite.config.ts           # Vite configuration
├── drizzle.config.ts        # Drizzle ORM configuration
└── package.json
```

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines to ensure a smooth collaboration.

### Getting Started

1. **Fork the repository** and clone your fork locally
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Make your changes** following our code style guidelines
4. **Test your changes** locally (both Replit and local environments)
5. **Submit a pull request** with a clear description

### Code Style Guidelines

- Use TypeScript for all new code
- Follow existing patterns in the codebase
- Use meaningful variable and function names
- Add JSDoc comments for exported functions
- Keep components small and focused

### Commit Messages

Use clear, descriptive commit messages:
```
feat: add voice session persistence
fix: resolve database connection timeout
docs: update README with local setup instructions
refactor: extract audio processing into separate service
```

### Testing Changes

Before submitting a PR, ensure:

1. **TypeScript compiles**: `npm run typecheck`
2. **Frontend builds**: `npm run build`
3. **App runs locally**: `npm run dev`
4. **Database migrations work**: `npm run db:migrate`

---

## ⚠️ Replit vs Local Development

This project supports both Replit and local development environments. Here are important differences to keep in mind:

### Port Configuration

| Environment | Frontend Port | Backend Port |
|-------------|---------------|--------------|
| Replit      | 5000          | 3001         |
| Local       | 5000          | 3001         |

**Important**: The frontend must always bind to port 5000 for Replit compatibility.

### Database

- **Replit**: Uses built-in PostgreSQL (Neon-backed). Connection string is auto-configured via `DATABASE_URL` secret.
- **Local**: You must provide your own PostgreSQL instance and set `DATABASE_URL` in `.env`.

### Environment Variables

- **Replit**: Secrets are managed via the Secrets tab in the Replit UI. Never commit secrets.
- **Local**: Use a `.env` file (which is gitignored).

### Vite Configuration

The `vite.config.ts` is configured to work in both environments:
- Allows all hosts (required for Replit's proxy)
- Proxies `/api` requests to the backend on port 3001

**Do not modify these settings** unless you understand the implications for Replit:

```typescript
server: {
  host: '0.0.0.0',
  port: 5000,
  allowedHosts: true,  // Required for Replit
  proxy: {
    '/api': 'http://localhost:3001'
  }
}
```

### What NOT to Change

To maintain Replit compatibility:

1. **Do not change the frontend port** from 5000
2. **Do not remove `allowedHosts: true`** from Vite config
3. **Do not use Docker** or containerization (not supported in Replit's Nix environment)
4. **Do not hardcode localhost URLs** in frontend code that calls the backend - use relative paths (`/api/...`)

---

## 📊 Database Schema

The PostgreSQL database includes these tables:

| Table | Purpose |
|-------|---------|
| `users` | User accounts |
| `user_settings` | User preferences and persona selection |
| `conversations` | Chat conversation threads |
| `messages` | Individual messages in conversations |
| `notes` | User notes with tags and attachments |
| `emails` | Email drafts, sent, and received emails |
| `calendar_events` | Calendar entries |
| `canvas_items` | Dynamic canvas content (charts, emails, images) |
| `images` | Image metadata and storage |
| `voice_sessions` | Voice conversation sessions |
| `transcripts` | Voice transcripts |
| `tool_executions` | AI tool execution logs |
| `api_logs` | API request/response logs |
| `error_logs` | Error tracking |

### Making Schema Changes

1. Edit `server/src/db/schema.ts`
2. Run `npm run db:migrate` to push changes
3. Test thoroughly before committing

**Never change primary key types** on existing tables - this breaks migrations.

---

## 🔧 Troubleshooting

### Frontend not loading in Replit

1. Check that the workflow is running
2. Verify Vite is binding to port 5000
3. Ensure `allowedHosts: true` is in `vite.config.ts`

### Database connection errors

1. Verify `DATABASE_URL` is set correctly
2. Check that PostgreSQL is running
3. Run `npm run db:migrate` to ensure schema is up to date

### Gemini API errors

1. Verify `GEMINI_API_KEY` is set
2. Check API key has proper permissions
3. Ensure you're not exceeding rate limits

---

## 📄 License

This project is open-source under the MIT License.

---

*Built with ❤️ using the Google Gemini API.*

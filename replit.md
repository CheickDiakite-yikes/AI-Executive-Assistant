# Maya - AI Executive Assistant

## Overview
Maya is an AI-powered executive assistant application built with a modern React frontend and Express.js backend. It uses Google's Gemini API for AI capabilities including voice conversations, text chat, and tool execution.

## Tech Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS with glassmorphism design
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: Google Gemini API (gemini-2.5-flash-native-audio-preview)
- **Logging**: Pino with structured logging

## Project Structure
```
/
├── App.tsx              # Main React application
├── components/          # React UI components
├── constants.ts         # App configuration and personas
├── services/            # Frontend services (tools, etc.)
├── types.ts             # TypeScript type definitions
├── utils/               # Frontend utilities (routing, telemetry)
├── server/
│   ├── src/
│   │   ├── index.ts     # Express server entry
│   │   ├── db/          # Database schema and connection
│   │   ├── middleware/  # Request logging, error handling
│   │   ├── routes/      # API endpoints
│   │   ├── services/    # Backend services (log persistence)
│   │   └── utils/       # Logger, helpers
```

## Database Schema
The PostgreSQL database includes these tables:
- **users** - User accounts
- **user_settings** - User preferences and persona selection
- **conversations** - Chat conversation threads
- **messages** - Individual messages in conversations
- **notes** - User notes with tags and attachments
- **emails** - Email drafts, sent, and received emails
- **calendar_events** - Calendar entries
- **canvas_items** - Dynamic canvas content (charts, emails, images, etc.)
- **images** - Image metadata and storage
- **voice_sessions** - Voice conversation sessions
- **transcripts** - Voice transcripts
- **tool_executions** - AI tool execution logs
- **api_logs** - API request/response logs
- **error_logs** - Error tracking

## Environment Variables
Required secrets:
- `GEMINI_API_KEY` - Google Gemini API key
- `DATABASE_URL` - PostgreSQL connection string

## Running the Application
The workflow runs both frontend (port 5000 via Vite proxy to 3000) and backend (port 3001):
```
npx drizzle-kit push --force && npm run dev:server & npm run dev:frontend
```

## API Endpoints
- `GET /api/health` - Health check with environment status
- `POST /api/notes` - CRUD operations for notes
- `POST /api/canvas` - Canvas item management
- `POST /api/conversations` - Conversation management
- `POST /api/telemetry/error` - Frontend error reporting
- `POST /api/telemetry/tool-execution` - Tool execution logging
- `POST /api/telemetry/event` - General event logging

## AI Personas
Maya supports multiple AI personas:
- **Maya** - Warm, creative collaborator
- **Atlas** - Precise, strategic partner
- **Nova** - Energetic, fast-paced assistant
- **Zorra** - Best friend energy

## Recent Changes
- 2026-01-28: Updated README.md with comprehensive contribution guidelines and local development setup
- 2026-01-28: Enhanced database schema with voice sessions, transcripts, tool executions, and error logs
- 2026-01-28: Added log persistence to database for API requests and errors
- 2026-01-28: Created telemetry API endpoint for frontend error reporting
- 2026-01-28: Verified GEMINI_API_KEY integration

## User Preferences
- Focus on proper logging and error tracking
- Database-backed persistence for all features
- Production-ready infrastructure

## Contributing (Quick Reference)
See README.md for full details. Key points:
- Frontend binds to port 5000 (required for Replit)
- Backend runs on port 3001
- Do not modify `allowedHosts: true` in vite.config.ts
- Use relative paths (`/api/...`) for backend calls, not localhost
- Run `npm run typecheck` before submitting PRs

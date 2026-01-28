# Maya - AI Executive Assistant

## Overview
Maya is an AI-powered executive assistant web application built with React, TypeScript, and Vite. It uses the Google Gemini API for AI capabilities.

## Tech Stack
- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS (via CDN)
- **AI**: Google Gemini API (@google/genai)
- **Icons**: Lucide React

## Project Structure
```
/
├── App.tsx           # Main application component
├── index.tsx         # Entry point
├── index.html        # HTML template
├── index.css         # Global styles
├── constants.ts      # Application constants
├── types.ts          # TypeScript type definitions
├── vite.config.ts    # Vite configuration
├── components/       # React components
├── services/         # Service layer (API calls, etc.)
└── package.json      # Dependencies and scripts
```

## Development
- **Port**: 5000 (configured in vite.config.ts)
- **Host**: 0.0.0.0 (allows external access)
- **Run Command**: `npm run dev`

## Environment Variables
- `GEMINI_API_KEY`: Required for AI functionality (Google Gemini API key)

## Recent Changes
- January 28, 2026: Initial Replit setup
  - Configured Vite to run on port 5000 with allowedHosts enabled
  - Set up workflow for development server
  - Configured deployment settings

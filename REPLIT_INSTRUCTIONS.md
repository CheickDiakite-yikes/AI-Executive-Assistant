# Instructions for Replit Agent

The application requires specific environment variables and network configurations to run in the Replit container.

## 1. Secrets (Environment Variables)
**CRITICAL**: You MUST set these in the Replit "Secrets" (Environment Variables) tab. The app will crash immediately without them.

`DATABASE_URL`:
- **Required**: Yes (The app throws an error if missing).
- **Value**: Use the built-in Replit Postgres URL if available, or an external Neon/Supabase URL.
- *Tip for Agent*: "Please provision a Replit Postgres database and set `DATABASE_URL`."

`GEMINI_API_KEY`:
- **Required**: Yes (For AI features).
- **Value**: Your Google Gemini API Key.

## 2. Dependencies
We have already created a `replit.nix` file. Ensure you:
1.  Run `npm install` to install Node.js dependencies.
2.  Run `npm run db:migrate` (or `drizzle-kit push`) to set up the database schema *after* the database is provisioned.

## 3. Running the App
Run the following command in the **Shell**:
```bash
npm run dev
```

## 4. Troubleshooting "Connection Refused"
We have already verified that the server listens on `0.0.0.0` (required for Replit).
- **Frontend**: Port 5000 (Vite) - *This is the one you should see.*
- **Backend**: Port 3001 (Express)

We configured `.replit` to automatically expose Port 5000. If you still see the backend JSON:
1.  Open the **Webview** panel.
2.  Change the address bar URL to port 5000 (e.g., `https://...-5000.app.github.dev` or similar).


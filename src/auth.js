/**
 * auth.js — One-time OAuth2 setup for Google Tasks.
 * Run: node src/auth.js
 * Saves tokens to .tokens.json (gitignored).
 */

import { google } from "googleapis";
import { createServer } from "http";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import open from "open";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const TOKENS_PATH = join(ROOT, ".tokens.json");
const CREDS_PATH = join(ROOT, ".credentials.json");

// ─── Load client credentials ────────────────────────────────────────────────
if (!existsSync(CREDS_PATH)) {
  console.error(`
❌  .credentials.json not found.

Steps:
  1. Go to https://console.cloud.google.com/
  2. Create a project → Enable "Tasks API"
  3. Create OAuth 2.0 Client ID (Desktop app)
  4. Download JSON → save as .credentials.json in project root
`);
  process.exit(1);
}

const creds = JSON.parse(readFileSync(CREDS_PATH, "utf-8"));
const { client_id, client_secret, redirect_uris } = creds.installed || creds.web;

const REDIRECT_PORT = 3333;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}`;

const oauth2 = new google.auth.OAuth2(client_id, client_secret, REDIRECT_URI);

const SCOPES = ["https://www.googleapis.com/auth/tasks"];

const authUrl = oauth2.generateAuthUrl({
  access_type: "offline",
  scope: SCOPES,
  prompt: "consent",
});

// ─── Start local server to catch the callback ────────────────────────────────
const server = createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);
  const code = url.searchParams.get("code");

  if (!code) {
    res.end("No code received. Try again.");
    return;
  }

  try {
    const { tokens } = await oauth2.getToken(code);
    writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2));
    res.end("<h2>✅ Authorization successful! You can close this tab.</h2>");
    console.log("\n✅ Tokens saved to .tokens.json — MCP server is ready.\n");
    server.close();
    process.exit(0);
  } catch (err) {
    res.end("Error getting tokens: " + err.message);
    console.error(err);
    server.close();
    process.exit(1);
  }
});

server.listen(REDIRECT_PORT, () => {
  console.log("\n🔑 Opening browser for Google authorization...\n");
  console.log("If it doesn't open automatically, go to:\n", authUrl, "\n");
  open(authUrl);
});

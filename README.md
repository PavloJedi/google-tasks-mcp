# google-tasks-mcp

MCP server for the Google Tasks API. It allows any AI agent (Claude, Cursor, and others) to read, create, update, and delete tasks via Google Tasks.

## Tools

| Tool | What it does |
|------|--------------|
| `list_task_lists` | Lists all task lists |
| `list_tasks` | Lists tasks from a list (filters: date, status) |
| `get_task` | Returns a single task by ID |
| `create_task` | Creates a task (`title`, `notes`, `due`, `parent`) |
| `update_task` | Updates any task field |
| `complete_task` | Marks a task as completed |
| `delete_task` | Permanently deletes a task |
| `move_task` | Moves/reorders a task |

---

## Setup (one-time)

### 1. Google Cloud Console

1. Go to [console.cloud.google.com](https://console.cloud.google.com/)
2. **Create a project** (or select an existing one)
3. Open **APIs & Services -> Library** -> find **"Tasks API"** -> Enable
4. Open **APIs & Services -> Credentials**
5. **Create Credentials -> OAuth client ID**
   - Application type: **Desktop app**
   - Name: `google-tasks-mcp`
6. Download the JSON file -> rename it to `.credentials.json` -> place it in the project root

### 2. Install dependencies

```bash
npm install
```

### 3. Authorize (one-time)

```bash
npm run auth
```

A browser window will open -> approve Google access -> tokens will be saved to `.tokens.json`.
After this, re-authorization is not required because tokens are refreshed automatically.

---

## Connect to Claude Desktop

Open `claude_desktop_config.json`:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

Add:

```json
{
  "mcpServers": {
    "google-tasks": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/google-tasks-mcp/src/index.js"]
    }
  }
}
```

Restart Claude Desktop -> new tools will appear in the interface.

## Connect to Claude Code

```bash
claude mcp add google-tasks -- node /ABSOLUTE/PATH/TO/google-tasks-mcp/src/index.js
```

## Connect to Cursor / Windsurf / other agents

Any agent that supports MCP (stdio transport):

```json
{
  "mcpServers": {
    "google-tasks": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/google-tasks-mcp/src/index.js"]
    }
  }
}
```

---

## Example prompts for your agent

```
"Show all my tasks for this week"
"Create a task 'Open PR' with deadline 2026-03-05"
"Mark task X as completed"
"Move task Y to the top of the list"
```

---

## Project structure

```
google-tasks-mcp/
├── src/
│   ├── index.js          — MCP server (tools + handlers)
│   ├── auth.js           — OAuth2 one-time setup
│   └── tasks-api.js      — Google Tasks API wrapper
├── .credentials.json     — (gitignored) your OAuth credentials
├── .tokens.json          — (gitignored) access + refresh tokens
├── .credentials.example.json
├── .gitignore
└── package.json
```

## Security

- `.credentials.json` and `.tokens.json` must **never be committed** (already in `.gitignore`)
- Tokens are refreshed automatically via the `googleapis` OAuth2 client

# google-tasks-mcp

MCP server for Google Tasks API. Дозволяє будь-якому AI-агенту (Claude, Cursor, та ін.) читати, створювати, оновлювати та видаляти задачі через Google Tasks.

## Tools

| Tool | Що робить |
|------|-----------|
| `list_task_lists` | Список усіх task lists |
| `list_tasks` | Задачі зі списку (фільтри: дата, статус) |
| `get_task` | Одна задача за ID |
| `create_task` | Створити задачу (title, notes, due, parent) |
| `update_task` | Оновити будь-яке поле |
| `complete_task` | Позначити як виконану |
| `delete_task` | Видалити назавжди |
| `move_task` | Перемістити / змінити порядок |

---

## Setup (один раз)

### 1. Google Cloud Console

1. Перейди на [console.cloud.google.com](https://console.cloud.google.com/)
2. **Створи проєкт** (або вибери існуючий)
3. Перейди в **APIs & Services → Library** → знайди **"Tasks API"** → Enable
4. Перейди в **APIs & Services → Credentials**
5. **Create Credentials → OAuth client ID**
   - Application type: **Desktop app**
   - Name: `google-tasks-mcp`
6. Завантаж JSON → перейменуй у `.credentials.json` → поклади в корінь проєкту

### 2. Встановити залежності

```bash
npm install
```

### 3. Авторизація (один раз)

```bash
npm run auth
```

Відкриється браузер → дозволи Google → токени збережуться у `.tokens.json`.
Після цього авторизація не потрібна — токени оновлюються автоматично.

---

## Підключення до Claude Desktop

Відкрий `claude_desktop_config.json`:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

Додай:

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

Перезапусти Claude Desktop → в інтерфейсі з'являться нові tools.

## Підключення до Claude Code

```bash
claude mcp add google-tasks -- node /ABSOLUTE/PATH/TO/google-tasks-mcp/src/index.js
```

## Підключення до Cursor / Windsurf / інших агентів

Будь-який агент, що підтримує MCP (stdio transport):

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

## Приклади запитів агенту

```
"Покажи всі мої задачі на цей тиждень"
"Створи задачу 'Зробити PR' з дедлайном 2026-03-05"
"Позначи задачу X як виконану"
"Перемісти задачу Y на початок списку"
```

---

## Структура проєкту

```
google-tasks-mcp/
├── src/
│   ├── index.js          — MCP server (tools + handlers)
│   ├── auth.js           — OAuth2 one-time setup
│   └── tasks-api.js      — Google Tasks API wrapper
├── .credentials.json     — (gitignored) твої OAuth credentials
├── .tokens.json          — (gitignored) access + refresh tokens
├── .credentials.example.json
├── .gitignore
└── package.json
```

## Security

- `.credentials.json` і `.tokens.json` — **ніколи не комітити** (вже в `.gitignore`)
- Токени оновлюються автоматично через `googleapis` OAuth2 client

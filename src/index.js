/**
 * Google Tasks MCP Server
 *
 * Tools exposed to AI agents:
 *   list_task_lists   — get all task lists
 *   list_tasks        — get tasks from a list (with filters)
 *   get_task          — get a single task by ID
 *   create_task       — create a new task
 *   update_task       — update title / notes / due / status
 *   complete_task     — shortcut: mark task as completed
 *   delete_task       — permanently delete a task
 *   move_task         — reorder or reparent a task
 *
 * Start: node src/index.js  (via stdio — standard MCP transport)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import {
  listTaskLists,
  listTasks,
  getTask,
  createTask,
  updateTask,
  completeTask,
  deleteTask,
  moveTask,
} from "./tasks-api.js";

// ─── Tool definitions ────────────────────────────────────────────────────────
const TOOLS = [
  {
    name: "list_task_lists",
    description: "Get all Google Task lists for the authenticated user.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "list_tasks",
    description:
      "Get tasks from a task list. Use tasklist_id='@default' for the default list.",
    inputSchema: {
      type: "object",
      properties: {
        tasklist_id: {
          type: "string",
          description: "Task list ID. Use '@default' for the default list.",
          default: "@default",
        },
        show_completed: {
          type: "boolean",
          description: "Include completed tasks. Default: false.",
          default: false,
        },
        due_min: {
          type: "string",
          description: "ISO 8601 date — only return tasks due on or after this date.",
        },
        due_max: {
          type: "string",
          description: "ISO 8601 date — only return tasks due on or before this date.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_task",
    description: "Get a single task by its ID.",
    inputSchema: {
      type: "object",
      properties: {
        tasklist_id: { type: "string", description: "Task list ID." },
        task_id: { type: "string", description: "Task ID." },
      },
      required: ["tasklist_id", "task_id"],
    },
  },
  {
    name: "create_task",
    description: "Create a new task in a task list.",
    inputSchema: {
      type: "object",
      properties: {
        tasklist_id: {
          type: "string",
          description: "Task list ID. Use '@default' for the default list.",
          default: "@default",
        },
        title: { type: "string", description: "Task title." },
        notes: { type: "string", description: "Task description / notes." },
        due: {
          type: "string",
          description: "Due date as ISO 8601 string, e.g. '2026-03-01T00:00:00.000Z'.",
        },
        parent: {
          type: "string",
          description: "Parent task ID (for sub-tasks).",
        },
      },
      required: ["title"],
    },
  },
  {
    name: "update_task",
    description: "Update an existing task. Only provided fields are changed.",
    inputSchema: {
      type: "object",
      properties: {
        tasklist_id: { type: "string", description: "Task list ID." },
        task_id: { type: "string", description: "Task ID to update." },
        title: { type: "string", description: "New title." },
        notes: { type: "string", description: "New notes." },
        due: { type: "string", description: "New due date (ISO 8601)." },
        status: {
          type: "string",
          enum: ["needsAction", "completed"],
          description: "Task status.",
        },
      },
      required: ["tasklist_id", "task_id"],
    },
  },
  {
    name: "complete_task",
    description: "Mark a task as completed.",
    inputSchema: {
      type: "object",
      properties: {
        tasklist_id: { type: "string", description: "Task list ID." },
        task_id: { type: "string", description: "Task ID." },
      },
      required: ["tasklist_id", "task_id"],
    },
  },
  {
    name: "delete_task",
    description: "Permanently delete a task.",
    inputSchema: {
      type: "object",
      properties: {
        tasklist_id: { type: "string", description: "Task list ID." },
        task_id: { type: "string", description: "Task ID." },
      },
      required: ["tasklist_id", "task_id"],
    },
  },
  {
    name: "move_task",
    description: "Move a task (reorder within a list or reparent to another task).",
    inputSchema: {
      type: "object",
      properties: {
        tasklist_id: { type: "string", description: "Task list ID." },
        task_id: { type: "string", description: "Task ID to move." },
        parent: {
          type: "string",
          description: "New parent task ID (omit to make it a top-level task).",
        },
        previous: {
          type: "string",
          description: "Task ID of the task after which this task should be placed.",
        },
      },
      required: ["tasklist_id", "task_id"],
    },
  },
];

// ─── Server setup ─────────────────────────────────────────────────────────────
const server = new Server(
  { name: "google-tasks-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;

    switch (name) {
      case "list_task_lists":
        result = await listTaskLists();
        break;

      case "list_tasks":
        result = await listTasks(args.tasklist_id || "@default", {
          showCompleted: args.show_completed,
          dueMin: args.due_min,
          dueMax: args.due_max,
        });
        break;

      case "get_task":
        result = await getTask(args.tasklist_id, args.task_id);
        break;

      case "create_task":
        result = await createTask(args.tasklist_id || "@default", {
          title: args.title,
          notes: args.notes,
          due: args.due,
          parent: args.parent,
        });
        break;

      case "update_task":
        result = await updateTask(args.tasklist_id, args.task_id, {
          title: args.title,
          notes: args.notes,
          due: args.due,
          status: args.status,
        });
        break;

      case "complete_task":
        result = await completeTask(args.tasklist_id, args.task_id);
        break;

      case "delete_task":
        result = await deleteTask(args.tasklist_id, args.task_id);
        break;

      case "move_task":
        result = await moveTask(args.tasklist_id, args.task_id, {
          parent: args.parent,
          previous: args.previous,
        });
        break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    return {
      content: [{ type: "text", text: `Error: ${err.message}` }],
      isError: true,
    };
  }
});

// ─── Start ───────────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("✅ google-tasks-mcp running on stdio");

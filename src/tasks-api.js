/**
 * tasks-api.js — Thin wrapper around Google Tasks REST API.
 * Returns plain JS objects, handles token refresh automatically via googleapis.
 */

import { google } from "googleapis";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const TOKENS_PATH = join(ROOT, ".tokens.json");
const CREDS_PATH = join(ROOT, ".credentials.json");

// ─── Build authenticated client ──────────────────────────────────────────────
function buildClient() {
  if (!existsSync(CREDS_PATH)) throw new Error("Missing .credentials.json — run: node src/auth.js");
  if (!existsSync(TOKENS_PATH)) throw new Error("Missing .tokens.json — run: node src/auth.js");

  const creds = JSON.parse(readFileSync(CREDS_PATH, "utf-8"));
  const { client_id, client_secret } = creds.installed || creds.web;

  const auth = new google.auth.OAuth2(client_id, client_secret);
  const tokens = JSON.parse(readFileSync(TOKENS_PATH, "utf-8"));
  auth.setCredentials(tokens);

  // Auto-save refreshed tokens
  auth.on("tokens", (newTokens) => {
    const merged = { ...tokens, ...newTokens };
    writeFileSync(TOKENS_PATH, JSON.stringify(merged, null, 2));
  });

  return google.tasks({ version: "v1", auth });
}

// ─── API methods ─────────────────────────────────────────────────────────────

/** List all task lists */
export async function listTaskLists() {
  const api = buildClient();
  const res = await api.tasklists.list({ maxResults: 100 });
  return (res.data.items || []).map((l) => ({
    id: l.id,
    title: l.title,
    updated: l.updated,
  }));
}

/**
 * List tasks in a task list.
 * @param {string} tasklistId - use "@default" for the default list
 * @param {object} opts - showCompleted, showHidden, dueMin, dueMax (ISO strings)
 */
export async function listTasks(tasklistId = "@default", opts = {}) {
  const api = buildClient();
  const res = await api.tasks.list({
    tasklist: tasklistId,
    maxResults: 100,
    showCompleted: opts.showCompleted ?? false,
    showHidden: opts.showHidden ?? false,
    dueMin: opts.dueMin,
    dueMax: opts.dueMax,
  });
  return (res.data.items || []).map(formatTask);
}

/**
 * Get a single task.
 */
export async function getTask(tasklistId, taskId) {
  const api = buildClient();
  const res = await api.tasks.get({ tasklist: tasklistId, task: taskId });
  return formatTask(res.data);
}

/**
 * Create a new task.
 * @param {string} tasklistId
 * @param {object} task - { title, notes, due (ISO date string), parent (taskId) }
 */
export async function createTask(tasklistId = "@default", task) {
  const api = buildClient();
  const body = {
    title: task.title,
    notes: task.notes,
    due: task.due, // e.g. "2026-03-01T00:00:00.000Z"
    status: "needsAction",
  };
  const params = { tasklist: tasklistId, requestBody: body };
  if (task.parent) params.parent = task.parent;
  const res = await api.tasks.insert(params);
  return formatTask(res.data);
}

/**
 * Update a task (partial — only provided fields are changed).
 * @param {string} tasklistId
 * @param {string} taskId
 * @param {object} updates - { title, notes, due, status ('needsAction'|'completed') }
 */
export async function updateTask(tasklistId, taskId, updates) {
  const api = buildClient();
  const body = {};
  if (updates.title !== undefined) body.title = updates.title;
  if (updates.notes !== undefined) body.notes = updates.notes;
  if (updates.due !== undefined) body.due = updates.due;
  if (updates.status !== undefined) body.status = updates.status;
  if (updates.status === "completed") body.completed = new Date().toISOString();
  const res = await api.tasks.patch({ tasklist: tasklistId, task: taskId, requestBody: body });
  return formatTask(res.data);
}

/**
 * Mark a task as completed.
 */
export async function completeTask(tasklistId, taskId) {
  return updateTask(tasklistId, taskId, { status: "completed" });
}

/**
 * Delete a task permanently.
 */
export async function deleteTask(tasklistId, taskId) {
  const api = buildClient();
  await api.tasks.delete({ tasklist: tasklistId, task: taskId });
  return { deleted: true, taskId };
}

/**
 * Move a task (reorder or reparent).
 */
export async function moveTask(tasklistId, taskId, opts = {}) {
  const api = buildClient();
  const res = await api.tasks.move({
    tasklist: tasklistId,
    task: taskId,
    parent: opts.parent,
    previous: opts.previous,
  });
  return formatTask(res.data);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatTask(t) {
  return {
    id: t.id,
    title: t.title || "",
    notes: t.notes || "",
    status: t.status, // "needsAction" | "completed"
    due: t.due || null,
    completed: t.completed || null,
    parent: t.parent || null,
    position: t.position || null,
    updated: t.updated,
    selfLink: t.selfLink,
  };
}

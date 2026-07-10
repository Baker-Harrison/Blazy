const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');
const { app } = require('electron');

// This file is the app's entire on-disk database layer. It stores
// everything that needs to survive closing and reopening the app:
// workspaces, tabs, split-pane layouts, and terminal scrollback. It uses
// "sql.js" — a version of the SQLite database engine that runs entirely in
// JavaScript — and saves the whole database out to a single file
// (blazy.sqlite) in the app's private data folder. Every function here is
// essentially a small, specific instruction like "get all workspaces" or
// "save a tab's layout," each translated into the appropriate SQL
// (Structured Query Language — the standard language for asking a database
// questions and telling it what to store) query.
//
// Note: this database still has a "messages" table left over from an
// earlier "Agent Chat" pane type that has since been removed. It's kept
// only so old tabs/workspaces can still be deleted cleanly (their leftover
// message rows get cleared out too) — nothing writes new rows into it
// anymore.

let db = null; // The live, in-memory database connection, once initialized.
let dbPath = null; // Where the .sqlite file lives on disk.
let initPromise = null; // Ensures we only run the (somewhat slow) setup once.

// Makes sure the database is loaded and ready, running the setup exactly
// once even if called many times concurrently (every exported function
// below calls this first).
function ensureInit() {
  if (!initPromise) initPromise = init();
  return initPromise;
}

// Loads the sql.js engine, opens (or creates) the database file, makes
// sure all the expected tables exist, and runs any one-time data
// migrations needed to bring an older saved database up to the current
// format.
async function init() {
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', file),
  });

  // "userData" is the standard, OS-appropriate folder for an app to store
  // its own private files (separate from the app's own program files) —
  // this is where the actual database file lives.
  dbPath = path.join(app.getPath('userData'), 'blazy.sqlite');
  const existing = fs.existsSync(dbPath) ? fs.readFileSync(dbPath) : null;
  db = existing ? new SQL.Database(existing) : new SQL.Database();

  // Creates every table the app needs, but only if it doesn't already
  // exist — so this is safe to run every time the app starts, whether the
  // database file is brand new or has been used for months.
  db.run(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      path TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tabs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      config TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tab_id INTEGER NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'agent')),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS layouts (
      workspace_id INTEGER PRIMARY KEY,
      tree TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS terminal_buffers (
      terminal_id TEXT PRIMARY KEY,
      data TEXT NOT NULL
    );
  `);

  // These next few functions handle upgrading a database that was created
  // by an OLDER version of the app, where the data was organized
  // differently (e.g. "projects" instead of "workspaces," or "threads"
  // instead of "tabs"). Each one checks whether the old structure is even
  // present before doing anything, so they're harmless no-ops on a
  // database that's already up to date.
  migrateLegacyProjects();
  addWorkspacePathColumn();
  migrateThreadsToTabs();
  seedIfEmpty();
  persist();
}

// Older databases might not have a "path" column on the workspaces table
// (added in a later version, once workspaces became tied to real folders
// on disk). This adds it if it's missing.
function addWorkspacePathColumn() {
  const hasPath = scalar(
    "SELECT COUNT(*) FROM pragma_table_info('workspaces') WHERE name = 'path'"
  );
  if (hasPath) return;
  db.run('ALTER TABLE workspaces ADD COLUMN path TEXT');
}

// Very old versions of this app used a "projects" table containing
// "workspaces" inside them, plus "threads" that belonged directly to a
// project instead of a workspace. This function detects that old shape and
// rewrites it into today's simpler "one workspace has many things
// directly" structure, so a user who's had the app installed for a long
// time doesn't lose their data across an update.
function migrateLegacyProjects() {
  const hasProjects = scalar(
    "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'projects'"
  );
  if (!hasProjects) return;

  db.run('ALTER TABLE threads ADD COLUMN workspace_id INTEGER');

  const oldWorkspaceIds = all('SELECT DISTINCT workspace_id AS id FROM projects').map((r) => r.id);
  for (const project of all('SELECT * FROM projects ORDER BY id')) {
    db.run('INSERT INTO workspaces (name, created_at) VALUES (?, ?)', [
      project.name,
      project.created_at,
    ]);
    const workspaceId = scalar('SELECT last_insert_rowid()');
    db.run('UPDATE threads SET workspace_id = ? WHERE project_id = ?', [workspaceId, project.id]);
  }
  for (const id of oldWorkspaceIds) db.run('DELETE FROM workspaces WHERE id = ?', [id]);

  // Rebuild the "threads" table without its old "project_id" column,
  // keeping only threads that were successfully attached to a workspace,
  // then remove the now-unused "projects" table entirely.
  db.run(`
    CREATE TABLE threads_migrated (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    INSERT INTO threads_migrated (id, workspace_id, title, created_at, updated_at)
      SELECT id, workspace_id, title, created_at, updated_at FROM threads
      WHERE workspace_id IS NOT NULL;
    DROP TABLE threads;
    ALTER TABLE threads_migrated RENAME TO threads;
    DROP TABLE projects;
  `);
}

// A slightly less old version of the app had a dedicated "threads" table
// (one per conversation) instead of representing each conversation as a
// "tab" of type 'chat', the way the app works today. This converts each
// old thread into a chat tab, and re-links its messages to point at the
// new tab id instead of the old thread id.
function migrateThreadsToTabs() {
  const hasThreads = scalar(
    "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'threads'"
  );
  if (!hasThreads) return;

  db.run('ALTER TABLE messages RENAME TO messages_legacy');
  db.run(`
    CREATE TABLE messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tab_id INTEGER NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'agent')),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  const threads = all('SELECT * FROM threads ORDER BY id');
  for (const thread of threads) {
    const config = JSON.stringify({ legacyThreadId: thread.id });
    db.run(
      'INSERT INTO tabs (workspace_id, type, title, config, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [thread.workspace_id, 'chat', thread.title, config, thread.created_at, thread.updated_at]
    );
    const tabId = scalar('SELECT last_insert_rowid()');
    db.run('INSERT INTO messages (tab_id, role, content, created_at) SELECT ?, role, content, created_at FROM messages_legacy WHERE thread_id = ?', [
      tabId,
      thread.id,
    ]);
  }

  db.run('DROP TABLE threads');
  db.run('DROP TABLE messages_legacy');
}

// Placeholder for adding starter/example data on a completely fresh
// install. Currently does nothing beyond checking whether the database is
// empty — reserved for future use (e.g. showing a sample workspace on
// first launch).
function seedIfEmpty() {
  const count = scalar('SELECT COUNT(*) FROM workspaces');
  if (count > 0) return;
}

// Writes the current in-memory database out to the actual .sqlite file on
// disk. sql.js keeps the whole database in memory while the app runs (for
// speed), so every function that changes data calls this afterward to make
// sure those changes are actually saved to disk and won't be lost if the
// app crashes or is closed.
function persist() {
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
}

// A small helper for running a query that returns exactly one value (like
// "COUNT(*)" or "last_insert_rowid()") and getting that value back
// directly, instead of a whole result table.
function scalar(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  stmt.step();
  const value = stmt.get()[0];
  stmt.free();
  return value;
}

// A small helper for running a query that returns multiple rows, getting
// them all back as a plain JavaScript array of objects (one object per
// row, with column names as keys).
function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

// A small helper for running a query that doesn't return any data at all
// (like INSERT, UPDATE, or DELETE) — just executes it.
function run(sql, params = []) {
  db.run(sql, params);
}

// --- workspaces --------------------------------------------------------------

// Returns every saved workspace, in the order they were created.
async function getWorkspaces() {
  await ensureInit();
  return all('SELECT id, name, path, created_at FROM workspaces ORDER BY id');
}

// Adds a brand-new workspace and returns its saved record (including the
// id the database assigned it).
async function createWorkspace(name, folderPath) {
  await ensureInit();
  const trimmed = String(name || '').trim();
  if (!trimmed) throw new Error('Workspace name is required');
  const now = new Date().toISOString();
  run('INSERT INTO workspaces (name, path, created_at) VALUES (?, ?, ?)', [
    trimmed,
    folderPath || null,
    now,
  ]);
  const id = scalar('SELECT last_insert_rowid()'); // The id SQLite just auto-generated for the new row.
  persist();
  return { id, name: trimmed, path: folderPath || null, created_at: now };
}

async function renameWorkspace(id, name) {
  await ensureInit();
  const trimmed = String(name || '').trim();
  if (!trimmed) throw new Error('Workspace name is required');
  run('UPDATE workspaces SET name = ? WHERE id = ?', [trimmed, id]);
  persist();
}

// Deletes a workspace AND everything that belongs to it — its tabs, any
// leftover message rows they had, and its saved layout — so nothing
// "orphaned" is left behind pointing at a workspace that no longer exists.
async function deleteWorkspace(id) {
  await ensureInit();
  run('DELETE FROM messages WHERE tab_id IN (SELECT id FROM tabs WHERE workspace_id = ?)', [id]);
  run('DELETE FROM tabs WHERE workspace_id = ?', [id]);
  run('DELETE FROM layouts WHERE workspace_id = ?', [id]);
  run('DELETE FROM workspaces WHERE id = ?', [id]);
  persist();
}

// --- tabs ----------------------------------------------------------------

// Returns every tab belonging to one workspace. Each tab's "config" is
// stored in the database as a JSON text string (a compact text format for
// storing structured data), so we parse it back into a normal JavaScript
// object before handing it to the rest of the app.
async function getTabs(workspaceId) {
  await ensureInit();
  const rows = all('SELECT * FROM tabs WHERE workspace_id = ? ORDER BY id', [workspaceId]);
  return rows.map((row) => ({ ...row, config: JSON.parse(row.config || '{}') }));
}

async function createTab(workspaceId, type, title, config = {}) {
  await ensureInit();
  const trimmedType = String(type || '').trim();
  const trimmedTitle = String(title || '').trim() || 'New Tab';
  if (!trimmedType) throw new Error('Tab type is required');
  const now = new Date().toISOString();
  run(
    'INSERT INTO tabs (workspace_id, type, title, config, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [workspaceId, trimmedType, trimmedTitle, JSON.stringify(config || {}), now, now]
  );
  const id = scalar('SELECT last_insert_rowid()');
  persist();
  return { id, workspace_id: workspaceId, type: trimmedType, title: trimmedTitle, config, created_at: now, updated_at: now };
}

// Updates just the fields that were actually provided (title and/or
// config) — this builds the UPDATE query dynamically so, for example,
// renaming a tab doesn't require also re-sending its whole config, and
// vice versa.
async function updateTab(id, updates) {
  await ensureInit();
  const sets = [];
  const params = [];
  if (updates.title !== undefined) {
    sets.push('title = ?');
    params.push(String(updates.title || '').trim() || 'New Tab');
  }
  if (updates.config !== undefined) {
    sets.push('config = ?');
    params.push(JSON.stringify(updates.config || {}));
  }
  if (sets.length === 0) return; // Nothing to actually update.
  params.push(id);
  run(`UPDATE tabs SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`, [
    ...params.slice(0, -1),
    new Date().toISOString(),
    id,
  ]);
  persist();
}

// Deletes a tab and any leftover message rows it had.
async function deleteTab(id) {
  await ensureInit();
  run('DELETE FROM messages WHERE tab_id = ?', [id]);
  run('DELETE FROM tabs WHERE id = ?', [id]);
  persist();
}

// --- layout ----------------------------------------------------------------

// Loads the saved split-pane layout tree (see layoutTree.js) for a
// workspace, parsing it back out of its stored JSON text form. Returns
// null if nothing has been saved yet, or if the saved text is somehow
// corrupted/unreadable — the rest of the app treats "null" as "start with
// an empty layout" rather than crashing.
async function getLayout(workspaceId) {
  await ensureInit();
  const row = all('SELECT tree FROM layouts WHERE workspace_id = ?', [workspaceId])[0];
  if (!row || !row.tree) return null;
  try {
    return JSON.parse(row.tree);
  } catch {
    return null;
  }
}

// Saves the layout tree, either updating the existing saved row for this
// workspace or inserting a brand-new one if this is the first time this
// workspace's layout has ever been saved.
async function saveLayout(workspaceId, tree) {
  await ensureInit();
  const existing = scalar('SELECT COUNT(*) FROM layouts WHERE workspace_id = ?', [workspaceId]);
  if (existing) {
    run('UPDATE layouts SET tree = ? WHERE workspace_id = ?', [JSON.stringify(tree || {}), workspaceId]);
  } else {
    run('INSERT INTO layouts (workspace_id, tree) VALUES (?, ?)', [workspaceId, JSON.stringify(tree || {})]);
  }
  persist();
}

// --- terminal scrollback -----------------------------------------------------
// (See terminal.js for the full explanation of why terminal output gets
// saved here — in short, so restarting the app doesn't lose what was
// printed in your open terminal tabs.)

async function getTerminalBuffer(terminalId) {
  await ensureInit();
  const row = all('SELECT data FROM terminal_buffers WHERE terminal_id = ?', [terminalId])[0];
  return row ? row.data : null;
}

// Synchronous so it can run inside 'before-quit' (async work would be cut off).
//
// In plain terms: Electron's "before-quit" moment doesn't reliably wait
// around for slow, asynchronous work to finish before the app actually
// closes — so unlike every other function in this file, this one must do
// its database writes immediately/synchronously (no "await"), to guarantee
// the terminal scrollback is actually saved before the app process ends.
function saveTerminalBuffersSync(entries) {
  if (!db) return;
  for (const [terminalId, data] of entries) {
    // "INSERT OR REPLACE" adds a new row, or if one already exists for
    // this terminal id, overwrites it instead of causing an error — a
    // convenient "just save this, I don't care if it's new or existing"
    // shortcut.
    run('INSERT OR REPLACE INTO terminal_buffers (terminal_id, data) VALUES (?, ?)', [
      terminalId,
      data || '',
    ]);
  }
  persist();
}

async function deleteTerminalBuffer(terminalId) {
  await ensureInit();
  run('DELETE FROM terminal_buffers WHERE terminal_id = ?', [terminalId]);
  persist();
}

// Exposes every function above so the rest of the background ("main")
// process can use this file as the app's single database access point.
module.exports = {
  ensureInit,
  getTerminalBuffer,
  saveTerminalBuffersSync,
  deleteTerminalBuffer,
  getWorkspaces,
  createWorkspace,
  renameWorkspace,
  deleteWorkspace,
  getTabs,
  createTab,
  updateTab,
  deleteTab,
  getLayout,
  saveLayout,
};

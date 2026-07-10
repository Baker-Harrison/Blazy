const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');
const { app } = require('electron');

let db = null;
let dbPath = null;
let initPromise = null;

function ensureInit() {
  if (!initPromise) initPromise = init();
  return initPromise;
}

async function init() {
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', file),
  });

  dbPath = path.join(app.getPath('userData'), 'blazy.sqlite');
  const existing = fs.existsSync(dbPath) ? fs.readFileSync(dbPath) : null;
  db = existing ? new SQL.Database(existing) : new SQL.Database();

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

  migrateLegacyProjects();
  addWorkspacePathColumn();
  migrateThreadsToTabs();
  seedIfEmpty();
  persist();
}

function addWorkspacePathColumn() {
  const hasPath = scalar(
    "SELECT COUNT(*) FROM pragma_table_info('workspaces') WHERE name = 'path'"
  );
  if (hasPath) return;
  db.run('ALTER TABLE workspaces ADD COLUMN path TEXT');
}

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

function seedIfEmpty() {
  const count = scalar('SELECT COUNT(*) FROM workspaces');
  if (count > 0) return;
}

function persist() {
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
}

function scalar(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  stmt.step();
  const value = stmt.get()[0];
  stmt.free();
  return value;
}

function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function run(sql, params = []) {
  db.run(sql, params);
}

async function getWorkspaces() {
  await ensureInit();
  return all('SELECT id, name, path, created_at FROM workspaces ORDER BY id');
}

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
  const id = scalar('SELECT last_insert_rowid()');
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

async function deleteWorkspace(id) {
  await ensureInit();
  run('DELETE FROM messages WHERE tab_id IN (SELECT id FROM tabs WHERE workspace_id = ?)', [id]);
  run('DELETE FROM tabs WHERE workspace_id = ?', [id]);
  run('DELETE FROM layouts WHERE workspace_id = ?', [id]);
  run('DELETE FROM workspaces WHERE id = ?', [id]);
  persist();
}

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
  if (sets.length === 0) return;
  params.push(id);
  run(`UPDATE tabs SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`, [
    ...params.slice(0, -1),
    new Date().toISOString(),
    id,
  ]);
  persist();
}

async function deleteTab(id) {
  await ensureInit();
  run('DELETE FROM messages WHERE tab_id = ?', [id]);
  run('DELETE FROM tabs WHERE id = ?', [id]);
  persist();
}

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

async function getMessages(tabId) {
  await ensureInit();
  return all('SELECT * FROM messages WHERE tab_id = ? ORDER BY id', [tabId]);
}

async function addMessage(tabId, role, content) {
  await ensureInit();
  if (role !== 'user' && role !== 'agent') throw new Error('Invalid message role');
  const trimmed = String(content || '').trim();
  if (!trimmed) throw new Error('Message content is required');
  const now = new Date().toISOString();
  run('INSERT INTO messages (tab_id, role, content, created_at) VALUES (?, ?, ?, ?)', [
    tabId,
    role,
    trimmed,
    now,
  ]);
  const id = scalar('SELECT last_insert_rowid()');
  run('UPDATE tabs SET updated_at = ? WHERE id = ?', [now, tabId]);
  persist();
  return { id, tab_id: tabId, role, content: trimmed, created_at: now };
}

async function getTerminalBuffer(terminalId) {
  await ensureInit();
  const row = all('SELECT data FROM terminal_buffers WHERE terminal_id = ?', [terminalId])[0];
  return row ? row.data : null;
}

// Synchronous so it can run inside 'before-quit' (async work would be cut off).
function saveTerminalBuffersSync(entries) {
  if (!db) return;
  for (const [terminalId, data] of entries) {
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
  getMessages,
  addMessage,
};

const pty = require('node-pty');
const { app, ipcMain, BrowserWindow } = require('electron');
const os = require('os');
const db = require('./db');

const shells = {
  win32: 'powershell.exe',
  darwin: 'zsh',
  linux: 'bash',
};

// Scrollback kept per terminal so a renderer can re-attach (tab switch, pane
// move, window reload) without losing output. Persisted to the DB on quit so
// a restarted app can restore what was on screen.
const BUFFER_CAP = 200_000;

const terminals = new Map(); // id -> { pty, buffer }
let nextId = 1;

function broadcast(channel, id, data) {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, id, data);
  }
}

function createTerminal(cwd) {
  const id = `term-${Date.now()}-${nextId++}`;
  const shell = shells[process.platform] || 'bash';
  const env = {
    ...process.env,
    TERM: 'xterm-256color',
    COLORTERM: 'truecolor',
  };
  // Avoid double-forcing Electron/Chromium color modes into the shell session.
  delete env.FORCE_COLOR;

  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: cwd || os.homedir(),
    env,
    // ConPTY reflows the buffer on resize; winpty repaints it garbled.
    useConpty: true,
  });

  const entry = { pty: ptyProcess, buffer: '' };

  ptyProcess.onData((data) => {
    entry.buffer = (entry.buffer + data).slice(-BUFFER_CAP);
    broadcast('terminal:data', id, data);
  });
  ptyProcess.onExit(({ exitCode }) => {
    broadcast('terminal:exit', id, exitCode);
    terminals.delete(id);
  });

  terminals.set(id, entry);
  return id;
}

// Re-attach to a terminal by id. If the pty is still alive, return its live
// scrollback; if the app was restarted, return the scrollback persisted at
// quit so the renderer can restore it above a fresh shell.
async function attachTerminal(id) {
  const entry = terminals.get(id);
  if (entry) return { alive: true, buffer: entry.buffer };
  const saved = await db.getTerminalBuffer(id);
  return { alive: false, buffer: saved || '' };
}

function writeTerminal(id, data) {
  terminals.get(id)?.pty.write(data);
}

function resizeTerminal(id, cols, rows) {
  terminals.get(id)?.pty.resize(cols, rows);
}

async function killTerminal(id) {
  const entry = terminals.get(id);
  if (entry) {
    entry.pty.kill();
    terminals.delete(id);
  }
  await db.deleteTerminalBuffer(id);
}

function persistBuffers() {
  db.saveTerminalBuffersSync([...terminals].map(([id, entry]) => [id, entry.buffer]));
}

function registerTerminalHandlers() {
  ipcMain.handle('terminal:create', (_e, cwd) => createTerminal(cwd));
  ipcMain.handle('terminal:attach', (_e, id) => attachTerminal(id));
  ipcMain.handle('terminal:write', (_e, id, data) => writeTerminal(id, data));
  ipcMain.handle('terminal:resize', (_e, id, cols, rows) => resizeTerminal(id, cols, rows));
  ipcMain.handle('terminal:kill', (_e, id) => killTerminal(id));

  app.on('before-quit', () => {
    persistBuffers();
  });
}

module.exports = { registerTerminalHandlers };

// This file handles the app's "check for updates" feature — the same idea
// as when your phone or another app tells you a newer version is ready and
// asks if you'd like to download and install it. This runs in the
// background "main" process (using the electron-updater library, which
// talks to GitHub Releases behind the scenes) and reports progress back to
// the on-screen UI.

const { ipcMain, BrowserWindow } = require('electron');
const { autoUpdater } = require('electron-updater');

// A function (set up later, in registerUpdaterHandlers) that returns the
// app's main window, so we can send it status messages.
let getMainWindow = null;

// Sends a small status update to the on-screen UI (for example: "checking",
// "an update is available", "12% downloaded"), so it can show a matching
// notification banner. If the window doesn't exist yet or has already been
// closed, there's nowhere to send the message, so we just skip it.
function sendStatus(status, data = {}) {
  const win = getMainWindow ? getMainWindow() : null;
  if (win && !win.isDestroyed()) {
    win.webContents.send('updater:status', { status, ...data });
  }
}

// Sets up everything related to auto-updating: listens for events from the
// electron-updater library and forwards them to the UI, and exposes a few
// actions (check / download / install) that the UI is allowed to trigger.
function registerUpdaterHandlers(getWindow) {
  getMainWindow = getWindow;

  // Each of these "on" calls listens for a specific moment in the update
  // process and reports it to the UI with a short status word plus any
  // relevant details (like the new version number).
  autoUpdater.on('checking-for-update', () => {
    sendStatus('checking');
  });

  autoUpdater.on('update-available', (info) => {
    sendStatus('available', { version: info.version, releaseNotes: info.releaseNotes });
  });

  autoUpdater.on('update-not-available', (info) => {
    sendStatus('not-available', { version: info.version });
  });

  // Fired repeatedly while a download is in progress, so the UI can show a
  // progress bar/percentage — similar to a download progress bar in a
  // browser.
  autoUpdater.on('download-progress', (progress) => {
    sendStatus('progress', {
      percent: Math.round(progress.percent),
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendStatus('downloaded', { version: info.version });
  });

  autoUpdater.on('error', (err) => {
    sendStatus('error', { message: err.message });
  });

  // These three handlers let the on-screen UI ask the background process to
  // do something (check/download/install), the same "controlled messaging
  // channel" pattern used elsewhere in the app (see files.js for another
  // example). Each wraps its action in a try/catch so that if something
  // goes wrong, we report a clean error status instead of silently failing
  // or crashing.
  ipcMain.handle('updater:check', async () => {
    try {
      await autoUpdater.checkForUpdates();
      return { ok: true };
    } catch (err) {
      sendStatus('error', { message: err.message });
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('updater:download', async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { ok: true };
    } catch (err) {
      sendStatus('error', { message: err.message });
      return { ok: false, error: err.message };
    }
  });

  // Installing quits the app and relaunches it with the new version applied
  // — the two "true" arguments tell electron-updater to force-close silently
  // and restart automatically, rather than asking the user extra questions.
  ipcMain.handle('updater:install', () => {
    autoUpdater.quitAndInstall(true, true);
  });
}

module.exports = { registerUpdaterHandlers };

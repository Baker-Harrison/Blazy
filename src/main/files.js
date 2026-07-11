// This file runs in the app's "main" process — the background part of the
// Electron app that has full access to the computer's file system (unlike
// the on-screen "renderer" process, which is sandboxed for security and
// can't read/write files directly). This file exposes a few safe, specific
// file operations (list a folder, read a file, write a file) that the
// on-screen UI can ask for through a controlled messaging channel.

const { ipcMain } = require('electron');
const fs = require('fs'); // Node.js's built-in file system toolkit.
const path = require('path'); // Helpers for building/joining file paths correctly.

// Lists everything inside a folder (files and subfolders), similar to what
// you'd see opening that folder in File Explorer/Finder.
async function readDir(dirPath) {
  // Ask the operating system for every item directly inside this folder.
  // "withFileTypes: true" means each item also tells us whether it's a
  // file or a folder, so we don't have to ask separately.
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  return entries
    .map((entry) => ({
      name: entry.name,
      path: path.join(dirPath, entry.name), // The full path to this item.
      isDirectory: entry.isDirectory(),
      isFile: entry.isFile(),
    }))
    // Sort the results the way a typical file browser does: all folders
    // first (alphabetically), then all files (alphabetically).
    .sort((a, b) => {
      if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
      return a.isDirectory ? -1 : 1;
    });
}

// Reads the full text contents of a single file (used, for example, when
// opening a file in the code editor pane).
async function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf-8');
}

// Saves text content to a file, overwriting whatever was there before (used
// when you hit "save" in the code editor).
async function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf-8');
}

// Reads a file as raw bytes and hands it back as "base64" — a way of
// encoding arbitrary binary data (like an image or a spreadsheet file) as
// plain text, since that's the only kind of data that can travel cleanly
// over the messaging bridge between the background process and the
// on-screen UI. This is used for file types where reading as plain text
// (like readFile above does) would corrupt the data — images, .xlsx
// spreadsheets, PDFs, etc.
async function readFileBinary(filePath) {
  const buffer = fs.readFileSync(filePath);
  return buffer.toString('base64');
}

// Wires up the functions above so the on-screen UI can call them.
// "ipcMain.handle" registers a named channel (like a phone extension
// number) — when the UI "calls" that channel name (e.g. 'fs:readFile'),
// Electron runs the matching function here in the background process and
// sends the result back. This is the security boundary that keeps random
// web content from directly touching your files — only these exact
// operations are allowed through.
function registerFileHandlers() {
  ipcMain.handle('fs:readDir', (_e, dirPath) => readDir(dirPath));
  ipcMain.handle('fs:readFile', (_e, filePath) => readFile(filePath));
  ipcMain.handle('fs:writeFile', (_e, filePath, content) => writeFile(filePath, content));
  ipcMain.handle('fs:readFileBinary', (_e, filePath) => readFileBinary(filePath));
}

module.exports = { registerFileHandlers };

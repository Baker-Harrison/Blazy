const { ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

async function readDir(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  return entries
    .map((entry) => ({
      name: entry.name,
      path: path.join(dirPath, entry.name),
      isDirectory: entry.isDirectory(),
      isFile: entry.isFile(),
    }))
    .sort((a, b) => {
      if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
      return a.isDirectory ? -1 : 1;
    });
}

async function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf-8');
}

async function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf-8');
}

function registerFileHandlers() {
  ipcMain.handle('fs:readDir', (_e, dirPath) => readDir(dirPath));
  ipcMain.handle('fs:readFile', (_e, filePath) => readFile(filePath));
  ipcMain.handle('fs:writeFile', (_e, filePath, content) => writeFile(filePath, content));
}

module.exports = { registerFileHandlers };

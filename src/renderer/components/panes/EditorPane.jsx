import { useCallback, useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { ChevronIcon, FileIcon, FolderIcon } from '../icons';

// The code Editor pane: a mini file browser (the "Explorer" panel) on the
// left, showing the folders/files inside the current workspace, and the
// actual text editor (powered by Monaco — the same engine as VS Code) on
// the right, for editing whichever file is selected. This gives the app a
// basic VS-Code-like editing experience.
export default function EditorPane({ tab, workspace }) {
  const rootPath = workspace.workspace?.path;
  // The folder tree data (files and subfolders) to show in the Explorer.
  const [tree, setTree] = useState([]);
  // Which folder paths are currently expanded (showing their contents) in
  // the Explorer tree.
  const [expanded, setExpanded] = useState(new Set());
  // Which file is currently open in the editor. Starts from whatever file
  // was previously open on this tab, if reopening.
  const [selectedFile, setSelectedFile] = useState(tab.config?.filePath || null);
  // The text content of the currently open file.
  const [content, setContent] = useState('');
  // A little timer we use to "debounce" autosaving — instead of writing to
  // disk on every single keystroke (which would be wasteful), we wait for
  // a short pause in typing before actually saving.
  const autosaveTimer = useRef(null);
  // Whatever edit is still waiting to be written to disk (if any). We keep
  // this around so that if the user switches files (or closes the tab)
  // before the debounce timer fires, we can flush it immediately instead
  // of silently throwing the edit away — otherwise the on-disk file would
  // be missing whatever was typed in the last 250ms.
  const pendingWrite = useRef(null);

  // Reads a folder's contents, and recursively pre-loads a couple of
  // levels of subfolders too (depth < 2), so expanding a folder in the
  // Explorer usually feels instant instead of needing to fetch again. Any
  // folder we can't read (e.g. permission denied) is silently treated as
  // empty rather than crashing the whole tree.
  const loadDir = useCallback(async (dirPath, depth = 0) => {
    try {
      const entries = await window.fs.readDir(dirPath);
      if (depth < 2) {
        for (const entry of entries) {
          if (entry.isDirectory) {
            entry.children = await loadDir(entry.path, depth + 1);
          }
        }
      }
      return entries;
    } catch {
      return [];
    }
  }, []);

  // Load the workspace's folder tree once we know its root path.
  useEffect(() => {
    if (rootPath) {
      loadDir(rootPath).then(setTree);
    }
  }, [rootPath, loadDir]);

  // Whenever the selected file changes, load its text content from disk.
  useEffect(() => {
    if (!selectedFile) {
      setContent('');
      return;
    }
    // "alive" prevents a slow/late file read from a PREVIOUS selection
    // from overwriting the content of whatever file is selected NOW.
    let alive = true;
    window.fs.readFile(selectedFile).then((text) => {
      // If the user already started typing in this file before the read
      // finished (e.g. it was slow to load), don't stomp on their edit
      // with the older content we just read from disk.
      if (alive && !pendingWrite.current) {
        setContent(text);
      }
    }).catch(() => {
      if (alive && !pendingWrite.current) {
        setContent('');
      }
    });
    return () => {
      alive = false;
      // If we're switching away from this file (or the pane is closing)
      // while an edit was still waiting to be autosaved, write it to disk
      // RIGHT NOW instead of just cancelling the timer — otherwise that
      // last bit of typing would never make it out of memory and the file
      // on disk would silently stay stale.
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
        autosaveTimer.current = null;
      }
      if (pendingWrite.current) {
        const { filePath, content: pendingContent } = pendingWrite.current;
        pendingWrite.current = null;
        window.fs.writeFile(filePath, pendingContent);
      }
    };
  }, [selectedFile]);

  // Searches the currently-loaded tree for the folder/file entry at a given
  // path — used to check whether a folder's contents have already been
  // fetched from disk, or still need to be.
  const findEntry = (nodes, targetPath) => {
    for (const node of nodes) {
      if (node.path === targetPath) return node;
      if (node.children) {
        const found = findEntry(node.children, targetPath);
        if (found) return found;
      }
    }
    return null;
  };

  // Expands or collapses a folder in the Explorer tree.
  //
  // loadDir() only eagerly pre-loads a couple of levels of subfolders up
  // front (see its comment above) to keep the initial load fast — anything
  // deeper than that hasn't been fetched yet. So whenever a folder is being
  // expanded, we check whether its contents were actually loaded; if not,
  // we fetch them right now. Without this, expanding a deeply-nested folder
  // would show it as "expanded" but permanently empty, even if it has real
  // files inside — the classic symptom being a folder that LOOKS empty in
  // the Explorer but clearly isn't when you check it on disk.
  const toggleFolder = (path) => {
    const isCurrentlyExpanded = expanded.has(path);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

    if (!isCurrentlyExpanded) {
      const entry = findEntry(tree, path);
      if (entry && entry.children === undefined) {
        loadDir(path).then((children) => {
          entry.children = children;
          // We mutated the entry object in place rather than rebuilding the
          // whole tree, so React won't notice anything changed on its own —
          // this makes a fresh copy of the top-level array just to trigger
          // a re-render, which then picks up the newly-fetched children.
          setTree((prevTree) => [...prevTree]);
        });
      }
    }
  };

  // Opens a file for editing, and remembers which file was opened on this
  // tab so reopening the tab later brings you back to the same file.
  const openFile = (filePath) => {
    setSelectedFile(filePath);
    workspace.updateTab(tab.id, { config: { ...tab.config, filePath } });
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 bg-app">
      {/* Left sidebar: the file/folder tree ("Explorer"). */}
      <div className="flex w-48 shrink-0 flex-col border-r border-edge bg-surface">
        <div className="flex h-8 shrink-0 items-center border-b border-edge px-3 text-[11px] font-medium uppercase tracking-wide text-ink-dim">
          Explorer
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto py-1">
          {tree.map((entry) => (
            <TreeNode
              key={entry.path}
              entry={entry}
              level={0}
              expanded={expanded}
              selectedFile={selectedFile}
              onToggle={toggleFolder}
              onSelect={openFile}
            />
          ))}
        </div>
      </div>

      {/* Right side: either the code editor for the selected file, or a
          placeholder message if nothing is selected yet. */}
      <div className="flex min-w-0 flex-1 flex-col">
        {selectedFile ? (
          <>
            <div className="flex h-8 shrink-0 items-center justify-between border-b border-edge px-3">
              <span className="truncate text-[12px] text-ink">{selectedFile}</span>
            </div>
            <div className="min-h-0 flex-1">
              <Editor
                theme="vs-dark"
                path={selectedFile}
                // Guesses which programming language this file is written
                // in (based on its file extension) so Monaco can apply the
                // right syntax highlighting (coloring keywords, strings,
                // etc. differently) — see languageForPath below.
                defaultLanguage={languageForPath(selectedFile)}
                value={content}
                onChange={(value) => {
                  const nextContent = value || '';
                  setContent(nextContent);
                  // Autosave: every time the text changes, reset the
                  // debounce timer. If the user keeps typing, the timer
                  // keeps getting pushed back; once they pause for half a
                  // second, we write the current content to disk.
                  if (autosaveTimer.current) {
                    clearTimeout(autosaveTimer.current);
                  }
                  const fileBeingEdited = selectedFile;
                  pendingWrite.current = { filePath: fileBeingEdited, content: nextContent };
                  autosaveTimer.current = setTimeout(() => {
                    autosaveTimer.current = null;
                    pendingWrite.current = null;
                    window.fs.writeFile(fileBeingEdited, nextContent);
                  }, 250);
                }}
                options={{
                  minimap: { enabled: false }, // Disables the small zoomed-out code preview on the right edge.
                  fontSize: 13,
                  automaticLayout: true, // Keeps the editor correctly sized as its container resizes.
                  scrollBeyondLastLine: false,
                }}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-[13px] text-ink-dim">
            Select a file from the explorer to edit.
          </div>
        )}
      </div>
    </div>
  );
}

// One row in the Explorer's file/folder tree — either a folder (which can
// be expanded/collapsed to reveal its children) or a plain file (which
// opens it in the editor when clicked). This function calls itself
// recursively to draw nested subfolders.
function TreeNode({ entry, level, expanded, selectedFile, onToggle, onSelect }) {
  const isExpanded = expanded.has(entry.path);

  if (entry.isDirectory) {
    return (
      <div>
        <button
          type="button"
          onClick={() => onToggle(entry.path)}
          className="flex w-full items-center gap-1 px-2 py-0.5 text-left text-[12px] text-ink hover:bg-hover"
          // Indents each nested level further to the right, so the tree
          // visually shows how deeply nested each folder/file is — the
          // same visual convention as any file browser's tree view.
          style={{ paddingLeft: `${level * 12 + 8}px` }}
        >
          <ChevronIcon
            className={`shrink-0 transition-transform ${isExpanded ? 'rotate-90' : 'rotate-0'}`}
          />
          <FolderIcon />
          <span className="truncate">{entry.name}</span>
        </button>
        {isExpanded && (
          <div>
            {entry.children?.map((child) => (
              <TreeNode
                key={child.path}
                entry={child}
                level={level + 1}
                expanded={expanded}
                selectedFile={selectedFile}
                onToggle={onToggle}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(entry.path)}
      className={`flex w-full items-center gap-1 px-2 py-0.5 text-left text-[12px] hover:bg-hover ${
        selectedFile === entry.path ? 'bg-hover text-white' : 'text-ink-dim'
      }`}
      style={{ paddingLeft: `${level * 12 + 24}px` }}
    >
      <FileIcon />
      <span className="truncate">{entry.name}</span>
    </button>
  );
}

// Looks at a file's extension (the letters after the last ".") to guess
// which programming language it's written in, so Monaco can apply the
// right syntax highlighting. Anything not in this list falls back to
// "plaintext" (no special highlighting, just plain text).
function languageForPath(filePath) {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const map = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    json: 'json',
    html: 'html',
    css: 'css',
    py: 'python',
    md: 'markdown',
    sql: 'sql',
  };
  return map[ext] || 'plaintext';
}

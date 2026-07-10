import { useCallback, useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { ChevronIcon, FileIcon, FolderIcon } from '../icons';

export default function EditorPane({ tab, workspace }) {
  const rootPath = workspace.workspace?.path;
  const [tree, setTree] = useState([]);
  const [expanded, setExpanded] = useState(new Set());
  const [selectedFile, setSelectedFile] = useState(tab.config?.filePath || null);
  const [content, setContent] = useState('');
  const [dirty, setDirty] = useState(false);

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

  useEffect(() => {
    if (rootPath) {
      loadDir(rootPath).then(setTree);
    }
  }, [rootPath, loadDir]);

  useEffect(() => {
    if (!selectedFile) {
      setContent('');
      return;
    }
    let alive = true;
    window.fs.readFile(selectedFile).then((text) => {
      if (alive) {
        setContent(text);
        setDirty(false);
      }
    }).catch(() => {
      if (alive) {
        setContent('');
        setDirty(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [selectedFile]);

  const handleSave = async () => {
    if (!selectedFile) return;
    await window.fs.writeFile(selectedFile, content);
    setDirty(false);
  };

  const toggleFolder = (path) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const openFile = (filePath) => {
    setSelectedFile(filePath);
    workspace.updateTab(tab.id, { config: { ...tab.config, filePath } });
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 bg-app">
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

      <div className="flex min-w-0 flex-1 flex-col">
        {selectedFile ? (
          <>
            <div className="flex h-8 shrink-0 items-center justify-between border-b border-edge px-3">
              <span className="truncate text-[12px] text-ink">{selectedFile}</span>
              {dirty && (
                <button
                  type="button"
                  onClick={handleSave}
                  className="rounded-md bg-hover px-2 py-0.5 text-[11px] text-ink hover:bg-ink-dim hover:text-app"
                >
                  Save
                </button>
              )}
            </div>
            <div className="min-h-0 flex-1">
              <Editor
                theme="vs-dark"
                path={selectedFile}
                defaultLanguage={languageForPath(selectedFile)}
                value={content}
                onChange={(value) => {
                  setContent(value || '');
                  setDirty(true);
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  automaticLayout: true,
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

function TreeNode({ entry, level, expanded, selectedFile, onToggle, onSelect }) {
  const isExpanded = expanded.has(entry.path);

  if (entry.isDirectory) {
    return (
      <div>
        <button
          type="button"
          onClick={() => onToggle(entry.path)}
          className="flex w-full items-center gap-1 px-2 py-0.5 text-left text-[12px] text-ink hover:bg-hover"
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

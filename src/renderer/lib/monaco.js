// This file sets up "Monaco" — the same code-editing engine that powers
// Microsoft's VS Code — so it can be used inside the Editor pane of this app.
// Monaco needs some extra setup to work well inside a bundled app like this
// one, which is what the code below handles.

import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

// Monaco does some of its heavy lifting (like checking your code for syntax
// errors, or formatting a file) on separate background threads called "web
// workers," instead of on the main thread that draws the screen. That keeps
// typing feeling instant instead of freezing while Monaco crunches numbers.
// Each of these imports pulls in the worker script for a specific language.
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

// Monaco asks the browser/app "which background worker should I use for this
// file?" by calling this function with a language "label" (like "css" or
// "typescript"). We answer by picking the matching worker we imported above.
// If we don't recognize the language, we fall back to the generic editor
// worker, which still handles basic editing features.
self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') return new jsonWorker();
    if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker();
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker();
    if (label === 'typescript' || label === 'javascript') return new tsWorker();
    return new editorWorker();
  },
};

// Tell the React wrapper library (@monaco-editor/react) to use the exact
// Monaco instance we just configured above, instead of trying to download
// its own copy from the internet.
loader.config({ monaco });

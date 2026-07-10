// A "pane" is one of the content areas you can open inside a workspace tab —
// for example a web browser, a terminal (command line), or a code editor.
// This file is a small lookup table that defines the different kinds of
// panes that exist and what icon/label each one uses, plus two little
// helper functions to look those up.

import { BrowserIcon, TerminalIcon, FileIcon } from '../components/icons';

// The master list of every pane type available in the app. Each entry says:
// "type" = the internal id used in code, "label" = the human-readable name
// shown in menus, "icon" = which icon component to draw next to it.
export const PANE_TYPES = [
  { type: 'browser', label: 'Browser', icon: BrowserIcon },
  { type: 'terminal', label: 'Terminal', icon: TerminalIcon },
  { type: 'editor', label: 'Editor', icon: FileIcon },
];

// Turn the list above into a fast lookup table (a Map), so that given a
// pane's "type" string (like "browser"), we can instantly find its full
// info without having to search through the whole list every time.
const byType = new Map(PANE_TYPES.map((t) => [t.type, t]));

// Given a pane type (e.g. "browser"), return the icon component to show for
// it. If the type isn't recognized for some reason, fall back to a generic
// file icon rather than showing nothing.
export function paneIcon(type) {
  return byType.get(type)?.icon || FileIcon;
}

// Same idea, but returns the human-readable label instead of the icon.
// Falls back to "New Tab" if the type isn't recognized.
export function paneLabel(type) {
  return byType.get(type)?.label || 'New Tab';
}

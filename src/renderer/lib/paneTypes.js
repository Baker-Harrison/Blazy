import { ChatIcon, BrowserIcon, TerminalIcon, FileIcon } from '../components/icons';

export const PANE_TYPES = [
  { type: 'chat', label: 'Agent Chat', icon: ChatIcon },
  { type: 'browser', label: 'Browser', icon: BrowserIcon },
  { type: 'terminal', label: 'Terminal', icon: TerminalIcon },
  { type: 'editor', label: 'Editor', icon: FileIcon },
];

const byType = new Map(PANE_TYPES.map((t) => [t.type, t]));

export function paneIcon(type) {
  return byType.get(type)?.icon || FileIcon;
}

export function paneLabel(type) {
  return byType.get(type)?.label || 'New Tab';
}

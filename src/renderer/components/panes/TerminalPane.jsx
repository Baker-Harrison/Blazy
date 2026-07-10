import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

const THEME = {
  background: '#16171b',
  foreground: '#e8eaf0',
  cursor: '#e8eaf0',
  cursorAccent: '#16171b',
  selectionBackground: '#2a2d35',
  selectionForeground: '#e8eaf0',
  selectionInactiveBackground: '#2c2f37',
  black: '#16171b',
  red: '#f2434f',
  green: '#4ec9b0',
  yellow: '#dcdcaa',
  blue: '#569cd6',
  magenta: '#c586c0',
  cyan: '#9cdcfe',
  white: '#e8eaf0',
  brightBlack: '#6a6a6a',
  brightRed: '#f14c4c',
  brightGreen: '#6a9955',
  brightYellow: '#d7ba7d',
  brightBlue: '#9cdcfe',
  brightMagenta: '#d7a8d7',
  brightCyan: '#b5cea8',
  brightWhite: '#ffffff',
};

export default function TerminalPane({ tab, workspace }) {
  const containerRef = useRef(null);
  const terminalRef = useRef(null);
  const fitAddonRef = useRef(null);
  const termIdRef = useRef(tab.config?.terminalId || null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const term = new Terminal({
      theme: THEME,
      fontFamily: '"Cascadia Code", ui-monospace, Consolas, monospace',
      fontSize: 13,
      lineHeight: 1.2,
      cursorBlink: true,
      convertEol: true,
      allowTransparency: false,
      scrollback: 5000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(container);

    // Fit after paint so the container has real dimensions.
    requestAnimationFrame(() => {
      fitAddon.fit();
    });

    terminalRef.current = term;
    fitAddonRef.current = fitAddon;

    const syncSize = (id) => {
      const { cols, rows } = term;
      if (cols && rows) window.terminals.resize(id, cols, rows);
    };

    // Re-attach to this tab's pty if it is still running (tab switch, pane
    // move, reload). After an app restart the pty is gone: restore the saved
    // scrollback, then start a fresh shell beneath it.
    const startTerminal = async () => {
      const savedId = tab.config?.terminalId;
      if (savedId) {
        const { alive, buffer } = await window.terminals.attach(savedId);
        if (alive) {
          if (buffer) term.write(buffer);
          termIdRef.current = savedId;
          syncSize(savedId);
          return;
        }
        if (buffer) {
          term.write(buffer);
          term.write('\r\n\x1b[2m── restored from previous session ──\x1b[0m\r\n\r\n');
        }
      }
      const id = await window.terminals.create(workspace.workspace?.path);
      termIdRef.current = id;
      workspace.updateTab(tab.id, { config: { ...tab.config, terminalId: id } });
      syncSize(id);
    };

    startTerminal();

    const onData = window.terminals.onData((id, data) => {
      if (id === termIdRef.current) term.write(data);
    });

    const onExit = window.terminals.onExit((id) => {
      if (id === termIdRef.current) {
        term.writeln('\r\n[Process exited]');
      }
    });

    term.onData((data) => {
      if (termIdRef.current) window.terminals.write(termIdRef.current, data);
    });

    // Don't touch the terminal size while a drag is in flight — refitting on
    // every frame makes ConPTY rewrap the buffer continuously and the text
    // visibly churns. Let the pane clip during the drag, then do a single
    // fit + pty resize once the size has been stable for a moment.
    let fitTimer = null;
    const fitAndResize = () => {
      fitTimer = null;
      if (!fitAddonRef.current || !terminalRef.current) return;
      const dims = fitAddonRef.current.proposeDimensions();
      if (!dims || !dims.cols || !dims.rows) return;
      const { cols, rows } = terminalRef.current;
      if (dims.cols === cols && dims.rows === rows) return;
      fitAddonRef.current.fit();
      const term = terminalRef.current;
      if (termIdRef.current && term.cols && term.rows) {
        window.terminals.resize(termIdRef.current, term.cols, term.rows);
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      if (fitTimer) clearTimeout(fitTimer);
      fitTimer = setTimeout(fitAndResize, 80);
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (fitTimer) clearTimeout(fitTimer);
      onData();
      onExit();
      // The pty stays alive; it is killed when the tab is closed, not when
      // this component unmounts (tab switch / pane move).
      term.dispose();
    };
  }, [tab.id]);

  return (
    <div
      ref={containerRef}
      className="terminal-pane h-full w-full min-h-0 min-w-0 flex-1 overflow-hidden bg-app"
    />
  );
}

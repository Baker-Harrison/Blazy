import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackIcon,
  ForwardIcon,
  RefreshIcon,
  StopIcon,
  LockIcon,
  GlobeIcon,
  PlusIcon,
  CloseIcon,
  AudioIcon,
} from './BrowserIcons';

// Chrome-only pane: the actual page is a native WebContentsView owned by the
// main process. We render the vertical tab rail + toolbar and continuously
// report where the page area sits so main can position the view over it.

function toURL(raw) {
  const text = raw.trim();
  if (!text) return null;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text) || text.startsWith('about:')) return text;
  // Looks like a host (has a dot or is localhost[:port]) → treat as URL.
  if (!/\s/.test(text) && (/^[^\s]+\.[^\s]{2,}/.test(text) || /^localhost(:\d+)?/.test(text))) {
    return `https://${text}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(text)}`;
}

function displayURL(url) {
  if (!url || url.startsWith('data:')) return '';
  return url;
}

function TabFavicon({ tab }) {
  return (
    <span className="flex h-4 w-4 shrink-0 items-center justify-center">
      {tab.loading ? (
        <span className="h-3 w-3 animate-spin rounded-full border border-ink-dim border-t-ink" />
      ) : tab.favicon ? (
        <img src={tab.favicon} alt="" className="h-4 w-4 rounded-[2px]" draggable={false} />
      ) : (
        <GlobeIcon />
      )}
    </span>
  );
}

function VerticalTab({ tab, active, expanded, onActivate, onClose }) {
  return (
    <div
      onMouseDown={(e) => {
        if (e.button === 1) return; // middle-click close handled in auxclick
        onActivate();
      }}
      onAuxClick={(e) => {
        if (e.button === 1) onClose();
      }}
      title={tab.title || tab.url}
      className={`group relative flex h-8 cursor-default items-center gap-2 rounded-md px-2 text-[12px] transition-colors duration-100 ${
        active ? 'bg-hover text-ink' : 'text-ink-dim hover:bg-hover/50 hover:text-ink'
      } ${expanded ? '' : 'justify-center px-0'}`}
    >
      <span
        className={`absolute inset-y-2 left-0 w-[2px] rounded-full bg-danger transition-opacity duration-150 ${
          active ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <TabFavicon tab={tab} />
      {expanded && (
        <>
          <span className="min-w-0 flex-1 truncate">{tab.title || 'New tab'}</span>
          {tab.audible && (
            <span className="shrink-0 text-ink-dim">
              <AudioIcon />
            </span>
          )}
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded text-ink-dim hover:bg-danger hover:text-white"
            title="Close tab"
          >
            <CloseIcon />
          </button>
        </>
      )}
    </div>
  );
}

function RailToggleIcon({ expanded }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12">
      <rect x="1" y="1.5" width="10" height="9" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1" />
      <line x1="4.5" y1="1.5" x2="4.5" y2="10.5" stroke="currentColor" strokeWidth="1" />
      {expanded && <rect x="1" y="1.5" width="3.5" height="9" rx="1.5" fill="currentColor" opacity="0.5" />}
    </svg>
  );
}

export default function BrowserPane({ tab, workspace }) {
  const paneId = String(tab.id);
  const [state, setState] = useState({ tabs: [], activeTabId: null });
  const [input, setInput] = useState('');
  const [editing, setEditing] = useState(false);
  const [railExpanded, setRailExpanded] = useState(tab.config?.railExpanded !== false);
  const contentRef = useRef(null);
  const inputRef = useRef(null);
  const persistTimer = useRef(null);
  const lastRect = useRef(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const activeTab = state.tabs.find((t) => t.id === state.activeTabId) || null;

  // --- Pane lifecycle: create native tabs from saved config, subscribe to state.
  useEffect(() => {
    const saved = tab.config || {};
    window.browser.ensurePane(paneId, {
      urls: saved.urls,
      activeIndex: saved.activeIndex,
      url: saved.url, // legacy single-url config
    });
    const offState = window.browser.onState((id, next) => {
      if (id === paneId) setState(next);
    });
    const offShortcut = window.browser.onShortcut((id, action) => {
      if (id !== paneId) return;
      if (action === 'new-tab') window.browser.newTab(paneId);
      if (action === 'focus-address') {
        setEditing(true);
        requestAnimationFrame(() => inputRef.current?.select());
        inputRef.current?.focus();
      }
      const s = stateRef.current;
      if (action === 'close-tab' && s.activeTabId) {
        window.browser.closeTab(paneId, s.activeTabId);
      }
      if ((action === 'next-tab' || action === 'prev-tab') && s.tabs.length > 1) {
        const i = s.tabs.findIndex((t) => t.id === s.activeTabId);
        const delta = action === 'next-tab' ? 1 : -1;
        window.browser.activateTab(paneId, s.tabs[(i + delta + s.tabs.length) % s.tabs.length].id);
      }
    });
    return () => {
      offState();
      offShortcut();
      window.browser.setViewport(paneId, null, false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paneId]);

  // --- Viewport tracking: report the content area's rect whenever it changes.
  useEffect(() => {
    let raf;
    lastRect.current = null;
    const tick = () => {
      const el = contentRef.current;
      if (el) {
        const r = el.getBoundingClientRect();
        // Inactive workspace tabs stay mounted with visibility:hidden and keep
        // their size, so rect alone isn't enough to know we're on screen.
        const visible =
          r.width > 0 &&
          r.height > 0 &&
          el.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true });
        const rect = { x: r.x, y: r.y, width: r.width, height: r.height, visible };
        const prev = lastRect.current;
        if (
          !prev ||
          prev.visible !== visible ||
          Math.abs(prev.x - rect.x) > 0.5 ||
          Math.abs(prev.y - rect.y) > 0.5 ||
          Math.abs(prev.width - rect.width) > 0.5 ||
          Math.abs(prev.height - rect.height) > 0.5
        ) {
          lastRect.current = rect;
          window.browser.setViewport(
            paneId,
            { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
            visible
          );
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paneId]);

  // --- Reflect active tab in the address bar (unless the user is typing).
  useEffect(() => {
    if (!editing) setInput(displayURL(activeTab?.url));
  }, [activeTab?.url, editing]);

  // --- Persist session (urls + active index) and surface page title, debounced.
  useEffect(() => {
    if (!state.tabs.length) return;
    clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      const urls = state.tabs.map((t) => t.url);
      const activeIndex = Math.max(0, state.tabs.findIndex((t) => t.id === state.activeTabId));
      const title = activeTab?.title || 'Browser';
      workspace.updateTab(tab.id, {
        title,
        config: {
          ...tab.config,
          urls,
          activeIndex,
          favicon: activeTab?.favicon || null,
          railExpanded,
          url: undefined,
        },
      });
    }, 600);
    return () => clearTimeout(persistTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, railExpanded]);

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      const url = toURL(input);
      if (!url) return;
      window.browser.navigate(paneId, url);
      setEditing(false);
      inputRef.current?.blur();
      window.browser.focusPage(paneId);
    },
    [input, paneId]
  );

  const handleChromeKeys = useCallback(
    (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === 't') {
        e.preventDefault();
        window.browser.newTab(paneId);
      } else if (key === 'w') {
        e.preventDefault();
        if (stateRef.current.activeTabId) window.browser.closeTab(paneId, stateRef.current.activeTabId);
      } else if (key === 'l') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    },
    [paneId]
  );

  const isSecure = activeTab?.url?.startsWith('https://');
  const loading = !!activeTab?.loading;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-app" onKeyDown={handleChromeKeys}>
      {/* Chrome row: nav + address bar */}
      <form
        onSubmit={handleSubmit}
        className="relative flex h-[38px] shrink-0 items-center gap-2 px-2 py-1 [-webkit-app-region:no-drag]"
      >
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => window.browser.back(paneId)}
            disabled={!activeTab?.canGoBack}
            className="flex h-7 w-7 items-center justify-center rounded text-ink transition-colors duration-100 hover:bg-hover disabled:cursor-not-allowed disabled:hover:bg-transparent"
            title="Back"
          >
            <BackIcon disabled={!activeTab?.canGoBack} />
          </button>
          <button
            type="button"
            onClick={() => window.browser.forward(paneId)}
            disabled={!activeTab?.canGoForward}
            className="flex h-7 w-7 items-center justify-center rounded text-ink transition-colors duration-100 hover:bg-hover disabled:cursor-not-allowed disabled:hover:bg-transparent"
            title="Forward"
          >
            <ForwardIcon disabled={!activeTab?.canGoForward} />
          </button>
          <button
            type="button"
            onClick={() => (loading ? window.browser.stop(paneId) : window.browser.reload(paneId))}
            className="flex h-7 w-7 items-center justify-center rounded text-ink transition-colors duration-100 hover:bg-hover"
            title={loading ? 'Stop' : 'Reload'}
          >
            {loading ? <StopIcon /> : <RefreshIcon />}
          </button>
        </div>

        <div className="flex h-[26px] min-w-0 flex-1 items-center gap-1.5 rounded-md border border-edge bg-surface px-2 transition-colors duration-100 focus-within:border-ink-dim">
          <span className={`shrink-0 ${isSecure ? 'text-green-400' : 'text-ink-dim'}`}>
            {isSecure ? <LockIcon /> : <GlobeIcon />}
          </span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => {
              setEditing(true);
              requestAnimationFrame(() => inputRef.current?.select());
            }}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setInput(displayURL(activeTab?.url));
                inputRef.current?.blur();
                window.browser.focusPage(paneId);
              }
            }}
            className="min-w-0 flex-1 bg-transparent text-[12px] text-ink placeholder:text-ink-dim focus:outline-none"
            placeholder="Search or enter address"
            spellCheck={false}
          />
        </div>

        <button
          type="button"
          onClick={() => setRailExpanded((v) => !v)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-ink-dim transition-colors duration-100 hover:bg-hover hover:text-ink"
          title={railExpanded ? 'Collapse tab rail' : 'Expand tab rail'}
        >
          <RailToggleIcon expanded={railExpanded} />
        </button>

        {/* Thin accent loading line, flush with the bottom of the chrome row. */}
        {loading && (
          <div className="absolute inset-x-0 bottom-0 h-[2px] overflow-hidden">
            <div className="h-full w-1/3 animate-[browser-loading_1.1s_ease-in-out_infinite] rounded-full bg-danger/70" />
          </div>
        )}
      </form>

      <div className="flex min-h-0 min-w-0 flex-1">
        {/* Vertical tab rail */}
        <div
          className={`flex shrink-0 flex-col gap-0.5 overflow-y-auto overflow-x-hidden py-1 pl-1.5 pr-1 transition-[width] duration-150 [scrollbar-width:none] ${
            railExpanded ? 'w-[188px]' : 'w-[40px]'
          }`}
        >
          {state.tabs.map((t) => (
            <VerticalTab
              key={t.id}
              tab={t}
              active={t.id === state.activeTabId}
              expanded={railExpanded}
              onActivate={() => window.browser.activateTab(paneId, t.id)}
              onClose={() => window.browser.closeTab(paneId, t.id)}
            />
          ))}
          <button
            type="button"
            onClick={() => window.browser.newTab(paneId)}
            className={`flex h-8 shrink-0 items-center gap-2 rounded-md px-2 text-[12px] text-ink-dim transition-colors duration-100 hover:bg-hover/50 hover:text-ink ${
              railExpanded ? '' : 'justify-center px-0'
            }`}
            title="New tab (Ctrl+T)"
          >
            <span className="flex h-4 w-4 shrink-0 items-center justify-center">
              <PlusIcon />
            </span>
            {railExpanded && <span>New tab</span>}
          </button>
        </div>

        {/* Page area — the native WebContentsView is positioned over this div. */}
        <div ref={contentRef} className="min-h-0 min-w-0 flex-1 bg-app">
          {activeTab?.crashed && (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <div className="text-[15px] font-light text-ink">This tab crashed</div>
              <button
                onClick={() => window.browser.activateTab(paneId, activeTab.id)}
                className="rounded-md border border-edge px-3 py-1 text-[12px] text-ink-dim transition-colors duration-100 hover:bg-hover hover:text-ink"
              >
                Reload tab
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

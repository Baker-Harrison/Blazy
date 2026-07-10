import { CloseIcon, MaximizeIcon, MinimizeIcon } from './icons';
import SidebarToggle from './SidebarToggle';

// This is the custom bar at the very top of the app window that replaces the
// normal Windows/Mac title bar. It contains the minimize, maximize, and
// close buttons (like the ones in the top corner of any window), but drawn
// in the app's own dark style instead of the operating system's default
// look. It also holds the sidebar toggle button when the sidebar is hidden.
//
// One small button used three times below, so we define it once here rather
// than repeating the same markup for minimize/maximize/close.
// - label: text for screen readers / tooltips.
// - danger: if true, the button turns red on hover (used for the Close
//   button, since closing is the "risky" action).
// - onClick: what happens when you click it.
// - children: the icon to draw inside the button.
function TitleBarButton({ label, danger = false, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`flex h-full w-[46px] items-center justify-center text-ink-dim transition-colors duration-100 hover:text-white ${
        danger ? 'hover:bg-danger' : 'hover:bg-hover'
      }`}
    >
      {children}
    </button>
  );
}

export default function TitleBar({ sidebarOpen, onToggleSidebar }) {
  return (
    // "[-webkit-app-region:drag]" is a special CSS instruction that tells
    // Electron "this whole area acts like a window's title bar — clicking
    // and dragging it moves the whole window around," which is how a
    // borderless/custom window can still be dragged like a normal one.
    <header className="flex h-[34px] shrink-0 select-none items-center justify-between bg-app [-webkit-app-region:drag]">
      {/* If the sidebar is currently hidden, show its "open" toggle button
          here in the titlebar instead (since there's no sidebar to put it
          in). If the sidebar is visible, just leave empty draggable space
          here instead. */}
      {!sidebarOpen ? (
        <div className="flex h-full items-center px-2 [-webkit-app-region:no-drag]">
          <SidebarToggle open={sidebarOpen} onToggle={onToggleSidebar} />
        </div>
      ) : (
        <div className="h-full flex-1 pl-3" />
      )}
      {/* Empty stretchy space in the middle — this is what you actually
          click-and-drag to move the window, since it has no buttons on it. */}
      <div className="h-full flex-1" />
      {/* The three window-control buttons, opted OUT of the "drag the
          window" behavior above (via no-drag) so clicking them performs
          their action instead of dragging the window. */}
      <div className="flex h-full [-webkit-app-region:no-drag]">
        <TitleBarButton label="Minimize" onClick={() => window.windowControls.minimize()}>
          <MinimizeIcon />
        </TitleBarButton>
        <TitleBarButton label="Maximize" onClick={() => window.windowControls.maximize()}>
          <MaximizeIcon />
        </TitleBarButton>
        <TitleBarButton label="Close" danger onClick={() => window.windowControls.close()}>
          <CloseIcon />
        </TitleBarButton>
      </div>
    </header>
  );
}

import { CloseIcon, MaximizeIcon, MinimizeIcon } from './icons';
import SidebarToggle from './SidebarToggle';

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
    <header className="flex h-[34px] shrink-0 select-none items-center justify-between bg-app [-webkit-app-region:drag]">
      {!sidebarOpen ? (
        <div className="flex h-full items-center px-2 [-webkit-app-region:no-drag]">
          <SidebarToggle open={sidebarOpen} onToggle={onToggleSidebar} />
        </div>
      ) : (
        <div className="h-full flex-1 pl-3" />
      )}
      <div className="h-full flex-1" />
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

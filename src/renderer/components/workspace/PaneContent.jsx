import ChatPane from '../panes/ChatPane';
import BrowserPane from '../panes/BrowserPane';
import TerminalPane from '../panes/TerminalPane';
import EditorPane from '../panes/EditorPane';

export default function PaneContent({ tab, workspace }) {
  let content;
  switch (tab.type) {
    case 'chat':
      content = <ChatPane tab={tab} workspace={workspace} />;
      break;
    case 'browser':
      content = <BrowserPane tab={tab} workspace={workspace} />;
      break;
    case 'terminal':
      content = <TerminalPane tab={tab} workspace={workspace} />;
      break;
    case 'editor':
      content = <EditorPane tab={tab} workspace={workspace} />;
      break;
    default:
      content = (
        <div className="flex h-full items-center justify-center text-[13px] text-ink-dim">
          Unknown pane type: {tab.type}
        </div>
      );
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {content}
    </div>
  );
}

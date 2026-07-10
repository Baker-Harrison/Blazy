import BrowserPane from '../panes/BrowserPane';
import TerminalPane from '../panes/TerminalPane';
import EditorPane from '../panes/EditorPane';

// Given one open tab, this component figures out WHICH kind of content to
// show inside it (a web browser, a terminal, or a code editor) and renders
// the right one. Think of it as a TV that shows a different channel
// depending on what "tab.type" is set to.
export default function PaneContent({ tab, workspace }) {
  let content;
  switch (tab.type) {
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
      // This should never normally happen, but if a tab somehow ends up
      // with an unrecognized type, show a clear message instead of a blank
      // or broken screen.
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

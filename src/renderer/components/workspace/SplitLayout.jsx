import { Fragment } from 'react';
import { Panel, Group, Separator } from 'react-resizable-panels';
import PaneContainer from './PaneContainer';

export default function SplitLayout({ node, workspace }) {
  if (!node) return null;

  if (node.type === 'pane') {
    return (
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <PaneContainer pane={node} workspace={workspace} />
      </div>
    );
  }

  const { direction, children, sizes } = node;
  const count = children.length;
  const defaultSizes = Array.isArray(sizes) && sizes.length === count
    ? sizes
    : Array(count).fill(100 / count);

  const defaultLayout = Object.fromEntries(
    children.map((child, index) => [child.id, defaultSizes[index]])
  );

  const handleLayout = (layout) => {
    const nextSizes = children.map((child) => layout[child.id] ?? 100 / count);
    workspace.resizeSplit(node.id, nextSizes);
  };

  return (
    <Group
      orientation={direction}
      className="h-full min-h-0 min-w-0 flex-1 bg-app"
      defaultLayout={defaultLayout}
      onLayoutChanged={handleLayout}
    >
      {children.map((child, index) => (
        <Fragment key={child.id}>
          {index > 0 && (
            <Separator className="pane-separator" />
          )}
          <Panel
            id={child.id}
            defaultSize={defaultSizes[index]}
            minSize={10}
            className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden"
          >
            <SplitLayout node={child} workspace={workspace} />
          </Panel>
        </Fragment>
      ))}
    </Group>
  );
}

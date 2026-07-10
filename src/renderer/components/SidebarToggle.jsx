import { PanelLeftIcon } from './icons';

/**
 * A small button that shows/hides the sidebar (the panel on the left with
 * your list of workspaces and files). When the sidebar is open, this button
 * lives inside the sidebar itself; when the sidebar is collapsed (hidden),
 * this same button moves up into the titlebar so you can still click it to
 * bring the sidebar back.
 *
 * Props (the settings passed into this component from its parent):
 * - open: true if the sidebar is currently visible, false if it's hidden.
 * - onToggle: a function to call when the button is clicked, which flips
 *   the sidebar between open and closed.
 */
export default function SidebarToggle({ open, onToggle }) {
  return (
    <button
      type="button"
      // aria-label/title: the text a screen reader announces, or that pops
      // up as a tooltip when you hover the mouse over the button.
      aria-label={open ? 'Collapse sidebar' : 'Open sidebar'}
      title={open ? 'Collapse sidebar' : 'Open sidebar'}
      onClick={onToggle}
      // These class names (from Tailwind CSS) style the button: a small
      // square that centers its icon, turns a lighter color on hover, and
      // opts out of the "whole titlebar is draggable" behavior so clicking
      // it doesn't accidentally drag the window.
      className="flex h-6 w-6 items-center justify-center rounded-md text-ink-dim transition-colors duration-100 hover:bg-hover hover:text-white [-webkit-app-region:no-drag]"
    >
      <PanelLeftIcon />
    </button>
  );
}

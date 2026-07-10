export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1" aria-label="Agent is typing">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-dim [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-dim [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-dim" />
    </div>
  );
}

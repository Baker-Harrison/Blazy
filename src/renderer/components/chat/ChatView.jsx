import { useEffect, useRef } from 'react';
import { useChat } from '../../hooks/useChat';
import Composer from './Composer';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';

export default function ChatView({ thread, workspace, onActivity }) {
  const { messages, typing, send } = useChat(thread?.id, { onActivity });
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, typing]);

  if (!thread) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 select-none">
        <span className="text-[26px] font-light text-ink">Blazy</span>
        <span className="text-[13px] text-ink-dim">
          Select a thread or create a new agent to start chatting.
        </span>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-baseline gap-2 px-6 pb-2 pt-1">
        <span className="text-[13px] font-medium text-ink">{thread.title}</span>
        {workspace && <span className="text-[11px] text-ink-dim">{workspace.name}</span>}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4 px-6 py-4">
          {messages.length === 0 && !typing && (
            <div className="pt-16 text-center text-[13px] text-ink-dim select-none">
              Start the conversation below.
            </div>
          )}
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {typing && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </div>

      <Composer key={thread.id} onSend={send} busy={typing} />
    </div>
  );
}

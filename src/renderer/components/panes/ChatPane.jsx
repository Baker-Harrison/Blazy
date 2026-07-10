import { useEffect, useRef, useState } from 'react';
import { dummyReply, replyDelay } from '../../lib/agentReplies';
import Composer from '../chat/Composer';
import MessageBubble from '../chat/MessageBubble';
import TypingIndicator from '../chat/TypingIndicator';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function ChatPane({ tab }) {
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    let alive = true;
    window.agentDB.getMessages(tab.id).then((rows) => {
      if (alive) setMessages(rows);
    });
    return () => {
      alive = false;
    };
  }, [tab.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, typing]);

  const send = async (text) => {
    const content = text.trim();
    if (!content) return;

    const userMessage = await window.agentDB.addMessage(tab.id, 'user', content);
    let count = 0;
    setMessages((prev) => {
      count = prev.length;
      return [...prev, userMessage];
    });

    setTyping(true);
    await sleep(replyDelay());
    const agentMessage = await window.agentDB.addMessage(tab.id, 'agent', dummyReply(count));
    setMessages((prev) => [...prev, agentMessage]);
    setTyping(false);
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-app">
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
      <Composer onSend={send} busy={typing} />
    </div>
  );
}

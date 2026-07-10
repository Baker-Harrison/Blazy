import { useCallback, useEffect, useRef, useState } from 'react';
import { dummyReply, replyDelay } from '../lib/agentReplies';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Message state for one thread: loads history, sends user messages, and
 * produces a (dummy) agent reply with a typing delay. Replies are persisted
 * to the thread they were sent from even if the user switches threads
 * mid-reply; UI state only updates when that thread is still open.
 */
export function useChat(threadId, { onActivity } = {}) {
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const openThreadRef = useRef(threadId);

  useEffect(() => {
    openThreadRef.current = threadId;
    setTyping(false);
    if (!threadId) {
      setMessages([]);
      return;
    }
    let alive = true;
    window.agentDB.getMessages(threadId).then((rows) => {
      if (alive) setMessages(rows);
    });
    return () => {
      alive = false;
    };
  }, [threadId]);

  const send = useCallback(
    async (text) => {
      const content = text.trim();
      if (!content || !threadId) return;

      const userMessage = await window.agentDB.addMessage(threadId, 'user', content);
      let count = 0;
      setMessages((prev) => {
        count = prev.length;
        return [...prev, userMessage];
      });
      onActivity?.();

      setTyping(true);
      await sleep(replyDelay());
      const agentMessage = await window.agentDB.addMessage(threadId, 'agent', dummyReply(count));
      if (openThreadRef.current === threadId) {
        setMessages((prev) => [...prev, agentMessage]);
        setTyping(false);
      }
      onActivity?.();
    },
    [threadId, onActivity]
  );

  return { messages, typing, send };
}

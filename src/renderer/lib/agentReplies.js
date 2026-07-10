/**
 * Placeholder agent responses until a real model is wired up.
 * Rotates through canned replies so consecutive answers don't repeat.
 */
const REPLIES = [
  "I'm a placeholder agent for now — the real model isn't wired up yet. But I did read your message, and it sounds important.",
  "Got it. Once I'm connected to an actual model I'll have something smarter to say about that.",
  'Interesting. If I had a brain right now, this is where the insight would go.',
  "Noted! I'm currently running on canned responses, so consider this a very confident acknowledgement.",
  'That makes sense. This dummy reply was generated locally in record time.',
  "Good question. My answer, for now, is whatever this sentence is — real responses are coming soon.",
];

export function dummyReply(messageCount) {
  return REPLIES[messageCount % REPLIES.length];
}

/** Fake "thinking" delay so the typing indicator is visible. */
export function replyDelay() {
  return 600 + Math.random() * 900;
}

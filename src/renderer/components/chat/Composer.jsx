import { useRef, useState } from 'react';
import { SendIcon } from '../icons';

export default function Composer({ onSend, busy = false }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);
  const canSend = text.trim().length > 0 && !busy;

  const autosize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  const submit = () => {
    if (!canSend) return;
    onSend(text);
    setText('');
    requestAnimationFrame(autosize);
    textareaRef.current?.focus();
  };

  return (
    <div className="shrink-0 px-6 pb-5 pt-2">
      <div className="mx-auto flex w-full max-w-[720px] items-end gap-2 rounded-lg border border-edge bg-app px-3 py-2 transition-colors duration-100 focus-within:border-[#4a505c]">
        <textarea
          ref={textareaRef}
          rows={1}
          autoFocus
          value={text}
          placeholder="Message Blazy…"
          onChange={(e) => {
            setText(e.target.value);
            autosize();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          className="max-h-40 min-w-0 flex-1 resize-none bg-transparent text-[13.5px] leading-relaxed text-ink placeholder:text-ink-dim focus:outline-none"
        />
        <button
          type="button"
          aria-label="Send message"
          disabled={!canSend}
          onClick={submit}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-hover text-ink transition-colors duration-100 hover:text-white disabled:opacity-40"
        >
          <SendIcon />
        </button>
      </div>
      <div className="mx-auto mt-1.5 w-full max-w-[720px] text-center text-[11px] text-ink-dim select-none">
        Responses are placeholders — no model is connected yet.
      </div>
    </div>
  );
}

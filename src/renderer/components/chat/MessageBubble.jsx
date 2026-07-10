export default function MessageBubble({ message }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] whitespace-pre-wrap rounded-lg bg-hover px-3.5 py-2 text-[13.5px] leading-relaxed text-ink">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink">
      {message.content}
    </div>
  );
}

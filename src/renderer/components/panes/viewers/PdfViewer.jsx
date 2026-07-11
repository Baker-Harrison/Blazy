import { useEffect, useState } from 'react';

// A PDF viewer: reads a .pdf file from disk as raw bytes and displays it
// using Chromium's own built-in PDF reader (the same one Chrome and Edge
// use for PDFs opened in a browser tab) — so we get scrolling, zooming,
// and text search "for free" without needing a separate PDF-rendering
// library. Used by EditorPane when the selected file is a PDF instead of
// text/code.
export default function PdfViewer({ filePath }) {
  const [dataUrl, setDataUrl] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setDataUrl(null);
    setFailed(false);
    window.fs.readFileBinary(filePath).then((base64) => {
      if (!alive) return;
      setDataUrl(`data:application/pdf;base64,${base64}`);
    }).catch(() => {
      if (alive) setFailed(true);
    });
    return () => {
      alive = false;
    };
  }, [filePath]);

  if (failed) {
    return (
      <div className="flex flex-1 items-center justify-center text-[13px] text-ink-dim">
        Couldn't load this PDF.
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div className="flex flex-1 items-center justify-center text-[13px] text-ink-dim">
        Loading PDF…
      </div>
    );
  }

  // "embed" hands the data straight to Chromium's built-in PDF plugin,
  // which draws its own toolbar (zoom, page navigation, download) on top
  // of the rendered pages.
  return (
    <embed
      src={dataUrl}
      type="application/pdf"
      className="h-full min-h-0 w-full flex-1"
    />
  );
}

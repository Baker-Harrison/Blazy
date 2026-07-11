import { useEffect, useState } from 'react';

// A simple image viewer: reads an image file from disk as raw bytes and
// displays it, centered, inside whatever space it's given. Used by
// EditorPane when the selected file is a picture (.png, .jpg, etc.)
// instead of text/code.
//
// Images are "binary" data (not plain text), so unlike the code editor's
// content-loading logic, this reads the file with window.fs.readFileBinary
// (see files.js) and turns the raw bytes into a "data URL" — a way of
// embedding a file's contents directly inside a src="..." attribute, as a
// long string of encoded text, instead of pointing at a separate file
// location. This sidesteps needing to expose file:// URLs to the page at
// all.
export default function ImageViewer({ filePath }) {
  // The data URL for the image, once we've loaded and encoded it. null
  // while loading, or if loading failed.
  const [dataUrl, setDataUrl] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // "alive" guards against a slow/late read from a PREVIOUS file
    // overwriting what's shown for the file that's selected NOW, the same
    // pattern EditorPane uses for text files.
    let alive = true;
    setDataUrl(null);
    setFailed(false);
    window.fs.readFileBinary(filePath).then((base64) => {
      if (!alive) return;
      setDataUrl(`data:${mimeForPath(filePath)};base64,${base64}`);
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
        Couldn't load this image.
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div className="flex flex-1 items-center justify-center text-[13px] text-ink-dim">
        Loading image…
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center overflow-auto bg-app p-4">
      <img
        src={dataUrl}
        alt={filePath}
        className="max-h-full max-w-full object-contain"
      />
    </div>
  );
}

// Looks at a file's extension to figure out its "MIME type" — a label that
// tells the browser what kind of data it's looking at (e.g. "this is a
// PNG picture") so it knows how to display it correctly.
function mimeForPath(filePath) {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const map = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
  };
  return map[ext] || 'application/octet-stream';
}

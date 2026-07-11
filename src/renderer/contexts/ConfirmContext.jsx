import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

// This file provides a replacement for the browser's plain, old-fashioned
// "confirm" popup (the grey box with an OK/Cancel button that looks like it's
// from Windows 95). Instead, any part of the app can call a function called
// "confirm" and get back a nice-looking, on-brand popup that matches the
// rest of the app's dark theme — and just like the browser version, the rest
// of the code can "await" it to find out whether the user clicked OK or
// Cancel.
//
// How this works, in plain terms:
// 1. We create a "Context" — think of it as a shared radio channel that any
//    component nested inside <ConfirmProvider> can tune into, without having
//    to pass props down through every single component in between.
// 2. <ConfirmProvider> is a wrapper component we place near the top of the
//    app (see App.jsx). It keeps track of "is a confirm dialog currently
//    open, and if so, what should it say," and renders the actual dialog
//    box on screen when needed.
// 3. useConfirm() is a small helper hook that any component (or, via a
//    component, any hook) can call to get the "confirm" function and ask the
//    user a yes/no question.

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  // "request" holds the details of the dialog currently being shown (its
  // title/message/button wording), or null when no dialog is open.
  const [request, setRequest] = useState(null);
  // We stash the "resolve" function for the currently pending Promise here,
  // so that when the user clicks a button we can hand the answer (true/false)
  // back to whoever called confirm() and is "await"-ing the result.
  const resolveRef = useRef(null);

  // The function other parts of the app will call, e.g.:
  //   const ok = await confirm({ title: 'Delete workspace "Blazy"?' });
  //   if (!ok) return;
  // It returns a Promise that "resolves" (finishes) with true if the user
  // clicked the confirm button, or false if they clicked Cancel, hit Escape,
  // or clicked outside the dialog.
  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setRequest(typeof options === 'string' ? { title: options } : options);
    });
  }, []);

  // Closes the dialog and reports the answer back to whoever is awaiting it.
  const settle = useCallback((answer) => {
    resolveRef.current?.(answer);
    resolveRef.current = null;
    setRequest(null);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request && (
        <ConfirmDialog
          {...request}
          onConfirm={() => settle(true)}
          onCancel={() => settle(false)}
        />
      )}
    </ConfirmContext.Provider>
  );
}

// The hook components (and the custom hooks they call, like useWorkspaces)
// use to get hold of the confirm() function described above.
export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return confirm;
}

// The actual popup box itself — the on-brand replacement for the browser's
// built-in confirm dialog. It sits on top of a dimmed, semi-transparent
// backdrop that covers the whole window, so the user's attention is drawn
// to the question and they can't click anything else until they answer it.
function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  danger = true,
  onConfirm,
  onCancel,
}) {
  // Let the user press the Escape key to back out of the dialog, just like
  // the browser's native confirm popup would let you do.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  return (
    <div
      // Clicking the dimmed backdrop counts as "Cancel" — a common pattern
      // for dismissing a popup without answering it.
      onClick={onCancel}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[1px]"
    >
      <div
        // Stop clicks inside the dialog box itself from bubbling up to the
        // backdrop above (which would otherwise close the dialog as if the
        // user had clicked outside it).
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-[340px] rounded-lg border border-edge bg-surface p-4 shadow-2xl"
      >
        <p id="confirm-dialog-title" className="text-[14px] font-medium text-ink">
          {title}
        </p>
        {description && (
          <p className="mt-1.5 text-[12.5px] leading-normal text-ink-dim">{description}</p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded px-3 py-1.5 text-[12.5px] text-ink-dim transition-colors hover:bg-hover hover:text-ink"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            // Focusing the confirm button as soon as the dialog appears lets
            // the user just press Enter to confirm, same as the native
            // dialog's default-button behavior.
            autoFocus
            onClick={onConfirm}
            className={`rounded px-3 py-1.5 text-[12.5px] font-medium text-white transition-colors ${
              danger ? 'bg-danger hover:bg-danger/90' : 'bg-hover hover:bg-hover/80'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

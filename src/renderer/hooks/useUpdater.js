import { useEffect, useState } from 'react';

// A "hook" is a reusable chunk of logic that a React component can plug
// into. This one manages everything about the app's auto-update feature:
// checking whether a newer version exists, downloading it, and installing
// it — similar to how apps on your phone check the app store for updates.
export function useUpdater() {
  // "status" is a short word describing where we are in the update process
  // (for example: "checking", "available", "downloading", "downloaded").
  // "info" holds extra details related to that status, like version numbers
  // or download progress.
  const [status, setStatus] = useState(null);
  const [info, setInfo] = useState({});

  // This runs once when the component first appears on screen (the empty
  // [] at the end means "don't re-run this unless the component is
  // recreated"). It listens for update-related messages coming from the
  // "main" process (the background part of the Electron app that actually
  // talks to the update server).
  useEffect(() => {
    // window.updater is a bridge set up elsewhere in the app that lets this
    // on-screen code talk to the background process. If it's missing for
    // some reason, there's nothing to hook up, so we just stop here.
    if (!window.updater) return undefined;

    // Whenever the background process reports a change in update status,
    // remember it so the screen can show something like "Update available!"
    const unsubscribe = window.updater.onStatus((payload) => {
      setStatus(payload.status);
      setInfo(payload);
    });

    // When this hook is no longer needed (e.g. the component is removed),
    // stop listening for updates so we don't leak memory or get duplicate
    // notifications later.
    return unsubscribe;
  }, []);

  // These three functions simply forward the request to the background
  // process, which does the actual work of checking for/downloading/
  // installing updates.
  const check = () => {
    if (window.updater) window.updater.check();
  };

  const download = () => {
    if (window.updater) window.updater.download();
  };

  const install = () => {
    if (window.updater) window.updater.install();
  };

  // Hand back everything a component needs: the current status/info to
  // display, plus the three actions it can trigger.
  return { status, info, check, download, install };
}

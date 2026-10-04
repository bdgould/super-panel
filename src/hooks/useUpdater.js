import { useCallback, useEffect, useState } from 'react';

// Auto-update status from the main process (see electron/updater.js)
export function useUpdater() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const updater = window.electron?.updater;
    if (!updater) return undefined;

    let active = true;
    updater.getStatus().then(initial => {
      if (active) setStatus(initial);
    });
    const unsubscribe = updater.onStatus(setStatus);

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const check = useCallback(() => window.electron?.updater?.check(), []);
  const install = useCallback(() => window.electron?.updater?.install(), []);

  return { status, check, install };
}

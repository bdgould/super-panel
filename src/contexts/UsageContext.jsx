import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const UsageContext = createContext(null);
export function UsageProvider({ children }) {
  const [status, setStatus] = useState({});
  const [error, setError] = useState(null);
  const act = useCallback(async (action, ...args) => {
    setError(null);
    try {
      const result = await window.electron.usage[action](...args);
      if (!result.success) throw new Error(result.error.message);
      setStatus(result.status);
      return result;
    } catch (failure) {
      setError(failure.message);
      return { success: false };
    }
  }, []);
  useEffect(() => {
    let mounted = true;
    let revision = 0;
    const unsubscribe = window.electron.usage.onStatus(next => { revision++; if (mounted) setStatus(next); });
    const startingRevision = revision;
    window.electron.usage.getStatus().then(result => {
      if (mounted && revision === startingRevision && result.success) setStatus(result.status);
    }).catch(() => { if (mounted) setError('Usage connections could not be loaded.'); });
    return () => { mounted = false; unsubscribe(); };
  }, []);
  return <UsageContext.Provider value={{ status, error, act }}>{children}</UsageContext.Provider>;
}
export function useUsage() { return useContext(UsageContext); }

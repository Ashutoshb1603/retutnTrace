import { useCallback, useEffect, useState } from 'react';
import { request } from '../lib/api.js';

export function useWorkspace(onError) {
  const [data, setData] = useState({
    health: null,
    overview: null,
    history: [],
    actions: [],
    returns: [],
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const health = await request('/health');
      setData((previous) => ({ ...previous, health }));
      if (!health.ok) return;
      const [overview, history, actions, returns] = await Promise.all([
        request('/overview'),
        request('/investigations'),
        request('/actions'),
        request('/returns'),
      ]);
      setData({ health, overview, history, actions, returns });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch((error) => onError(error.message));
  }, [refresh, onError]);

  return { ...data, loading, refresh };
}

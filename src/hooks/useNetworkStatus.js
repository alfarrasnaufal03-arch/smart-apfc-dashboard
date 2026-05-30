import { useState, useEffect, useCallback } from 'react';

export const useNetworkStatus = (
  pingUrl = '/api/ping',
  interval = 10_000,
  timeout = 20_000
) => {
  const [isOnline, setIsOnline] = useState(true);

  const checkStatus = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      const response = await fetch(pingUrl, {
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timeoutId);
      setIsOnline(response.ok);
    } catch {
      setIsOnline(false);
    }
  }, [pingUrl, timeout]);

  useEffect(() => {
    checkStatus();
    const timer = setInterval(checkStatus, interval);
    return () => clearInterval(timer);
  }, [checkStatus, interval]);

  return isOnline;
};
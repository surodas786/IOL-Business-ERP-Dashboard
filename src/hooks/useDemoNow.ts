import { useEffect, useState } from 'react';
import { demoNow } from '../utils/format';

/** Demo clock in milliseconds, refreshed on an interval so SLA countdowns stay live. */
export function useDemoNow(intervalMs = 30000): number {
  const [now, setNow] = useState(() => demoNow().getTime());
  useEffect(() => {
    const id = window.setInterval(() => setNow(demoNow().getTime()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
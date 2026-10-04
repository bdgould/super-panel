import { useEffect, useState } from 'react';
import { useConfig } from '../../contexts/ConfigContext';
import { useUsage } from '../../contexts/UsageContext';
import { visibleUsageProviders } from '../../utils/usage';
import { UsageCard } from './UsageCard';
import styles from './UsagePanel.module.css';

export function UsagePanel({ isFullScreen }) {
  const { settings } = useConfig();
  const { status, act } = useUsage();
  const [now, setNow] = useState(Date.now());
  const providers = visibleUsageProviders(settings, status);
  const visible = providers.length > 0;
  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(interval);
  }, [visible]);
  if (!visible) return null;
  return (
    <section className={`${styles.panel} ${isFullScreen ? styles.wide : ''}`} aria-label="AI usage windows">
      <div className={styles.cards}>
        {providers.map(provider => <UsageCard key={provider} provider={provider} state={status[provider]} now={now}
          onRefresh={() => act('refresh', provider)} />)}
      </div>
    </section>
  );
}

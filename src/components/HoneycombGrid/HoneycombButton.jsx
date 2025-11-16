import { useState } from 'react';
import { useLongPress } from '../../hooks/useLongPress';
import { useConfig } from '../../contexts/ConfigContext';
import styles from './HoneycombGrid.module.css';

export function HoneycombButton({ buttonId, config, onConfigure }) {
  const { executeAction } = useConfig();
  const [isPressed, setIsPressed] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const handlePress = async () => {
    if (!config || isExecuting) return;

    setIsExecuting(true);
    try {
      const result = await executeAction(config);
      if (!result.success) {
        console.error('Action failed:', result.error);
      }
    } catch (error) {
      console.error('Error executing action:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleLongPress = () => {
    if (onConfigure) {
      onConfigure(buttonId, config);
    }
  };

  const longPressProps = useLongPress(handleLongPress, {
    onPress: handlePress,
    onPressStart: () => setIsPressed(true),
    onPressEnd: () => setIsPressed(false),
  });

  // Use default values if no config
  const label = config?.label || 'Empty';
  const icon = config?.icon || '+';
  const color = config?.color || 'var(--color-accent-cyan)';
  const isEmpty = !config;

  return (
    <button
      className={`${styles.honeycombButton} ${isPressed ? styles.pressed : ''} ${isEmpty ? styles.empty : ''} ${isExecuting ? styles.executing : ''}`}
      style={{ '--button-color': color }}
      {...longPressProps}
      aria-label={isEmpty ? 'Configure button' : label}
    >
      <div className={styles.buttonContent}>
        <span className={styles.buttonIcon}>{icon}</span>
        <span className={styles.buttonLabel}>{label}</span>
      </div>
      {isExecuting && <div className={styles.spinner} />}
    </button>
  );
}

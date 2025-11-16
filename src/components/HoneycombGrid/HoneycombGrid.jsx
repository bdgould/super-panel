import { useConfig } from '../../contexts/ConfigContext';
import { HoneycombButton } from './HoneycombButton';
import { HONEYCOMB_CONFIG } from '../../utils/constants';
import styles from './HoneycombGrid.module.css';

export function HoneycombGrid({ onConfigureButton }) {
  const { buttons } = useConfig();

  // Generate button IDs for honeycomb grid
  // Default to 12 buttons (3 rows of 4)
  const buttonIds = Array.from({ length: 12 }, (_, i) => `button-${i}`);

  return (
    <div className={styles.honeycombContainer}>
      <div className={styles.honeycombGrid}>
        {buttonIds.map((buttonId, index) => {
          const isOddRow = Math.floor(index / HONEYCOMB_CONFIG.COLUMNS) % 2 === 1;

          return (
            <div
              key={buttonId}
              className={`${styles.honeycombCell} ${isOddRow ? styles.offset : ''}`}
            >
              <HoneycombButton
                buttonId={buttonId}
                config={buttons[buttonId]}
                onConfigure={onConfigureButton}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

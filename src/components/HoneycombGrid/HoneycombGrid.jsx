import { useConfig } from '../../contexts/ConfigContext';
import { HoneycombButton } from './HoneycombButton';
import { DEFAULT_GRID_DIMENSIONS } from '../../utils/constants';
import styles from './HoneycombGrid.module.css';

export function HoneycombGrid({ onConfigureButton }) {
  const { buttons, settings } = useConfig();

  // Get grid dimensions from settings, fallback to defaults
  const rows = settings?.gridDimensions?.rows || DEFAULT_GRID_DIMENSIONS.rows;
  const columns = settings?.gridDimensions?.columns || DEFAULT_GRID_DIMENSIONS.columns;

  // Generate button IDs for honeycomb grid
  const totalButtons = rows * columns;
  const buttonIds = Array.from({ length: totalButtons }, (_, i) => `button-${i}`);

  return (
    <div className={styles.honeycombContainer}>
      <div
        className={styles.honeycombGrid}
        style={{
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
        }}
      >
        {buttonIds.map((buttonId, index) => {
          const isOddRow = Math.floor(index / columns) % 2 === 1;

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

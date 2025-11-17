import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useLongPress } from '../../hooks/useLongPress';
import { useConfig } from '../../contexts/ConfigContext';
import { ALL_ICONS } from '../IconPicker/iconPresets';
import styles from './HoneycombGrid.module.css';

export function HoneycombButton({ buttonId, config, onConfigure }) {
  const { executeAction } = useConfig();
  const [isPressed, setIsPressed] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [imagePath, setImagePath] = useState(null);

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
  const icon = config?.icon || { type: 'emoji', value: '+' };
  const color = config?.color || 'var(--color-accent-cyan)';
  const isEmpty = !config;

  // Handle icon format - support both old (string) and new (object) formats
  const iconData = typeof icon === 'string'
    ? { type: 'emoji', value: icon }
    : icon;

  // Load image path for image-type icons
  useEffect(() => {
    if (iconData.type === 'image' && iconData.value) {
      window.electron.config.getIconPath(iconData.value)
        .then(result => {
          if (result.success) {
            // Convert file path to file:// URL for img src
            setImagePath(`file://${result.filepath.replace(/\\/g, '/')}`);
          }
        })
        .catch(error => {
          console.error('Failed to load icon image:', error);
          setImagePath(null);
        });
    }
  }, [iconData.type, iconData.value]);

  // Render icon based on type
  const renderIcon = () => {
    if (iconData.type === 'emoji') {
      return <span className={styles.buttonIcon}>{iconData.value}</span>;
    } else if (iconData.type === 'fontawesome') {
      const iconInfo = ALL_ICONS.find(i => i.name === iconData.value);
      if (iconInfo) {
        return <FontAwesomeIcon icon={iconInfo.icon} className={styles.buttonIcon} />;
      }
      // Fallback if icon not found
      return <span className={styles.buttonIcon}>⚡</span>;
    } else if (iconData.type === 'image') {
      if (imagePath) {
        return <img src={imagePath} alt={label} className={styles.buttonIconImage} />;
      }
      // Loading or fallback
      return <span className={styles.buttonIcon}>⚡</span>;
    }

    // Default fallback
    return <span className={styles.buttonIcon}>⚡</span>;
  };

  return (
    <button
      className={`${styles.honeycombButton} ${isPressed ? styles.pressed : ''} ${isEmpty ? styles.empty : ''} ${isExecuting ? styles.executing : ''}`}
      style={{ '--button-color': color }}
      {...longPressProps}
      aria-label={isEmpty ? 'Configure button' : label}
    >
      <div className={styles.buttonContent}>
        {renderIcon()}
        <span className={styles.buttonLabel}>{label}</span>
      </div>
      {isExecuting && <div className={styles.spinner} />}
    </button>
  );
}

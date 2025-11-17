import { useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ICON_CATEGORIES, POPULAR_ICONS, ALL_ICONS } from './iconPresets';
import styles from './IconPicker.module.css';

const MODES = {
  FONTAWESOME: 'fontawesome',
  UPLOAD: 'upload',
  EMOJI: 'emoji',
};

const COMMON_EMOJIS = [
  '⚡', '🔥', '⭐', '❤️', '💡', '🎮', '🎵', '📁',
  '🖥️', '⌨️', '🖱️', '📱', '💻', '🖨️', '📷', '🎥',
  '🔒', '🔓', '🔑', '⚙️', '🔧', '🔨', '⚔️', '🛡️',
  '📊', '📈', '📉', '💰', '🎯', '🚀', '🌐', '📡',
  '🔔', '📧', '📞', '💬', '🗨️', '📢', '📣', '🎤',
  '🎨', '🖌️', '✏️', '📝', '📋', '📌', '📍', '🗂️',
  '🔍', '🔎', '💾', '💿', '📀', '🗄️', '🌙', '☀️',
  '⚠️', '⛔', '🚫', '✅', '❌', '➕', '➖', '✖️',
];

export default function IconPicker({ value, onChange, buttonId }) {
  const [mode, setMode] = useState(MODES.FONTAWESOME);
  const [selectedCategory, setSelectedCategory] = useState('system');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadPreview, setUploadPreview] = useState(null);
  const fileInputRef = useRef(null);

  // Parse current value to determine type and actual value
  const getCurrentIcon = () => {
    if (!value) return { type: 'emoji', value: '⚡' };

    // Check if it's new format (object) or old format (string)
    if (typeof value === 'object' && value.type) {
      return value;
    }

    // Legacy format - assume emoji
    return { type: 'emoji', value: value || '⚡' };
  };

  const currentIcon = getCurrentIcon();

  // Handle Font Awesome icon selection
  const handleFontAwesomeSelect = (iconName) => {
    onChange({
      type: 'fontawesome',
      value: iconName,
    });
  };

  // Handle file upload
  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/x-icon'];
    if (!validTypes.includes(file.type)) {
      alert('Please select a valid image file (PNG, JPG, SVG, or ICO)');
      return;
    }

    // Validate file size (512KB max)
    if (file.size > 512 * 1024) {
      alert('Image file must be smaller than 512KB');
      return;
    }

    // Read file as base64
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Data = e.target.result;
      setUploadPreview(base64Data);

      try {
        // Call IPC to save the image
        const result = await window.electron.config.uploadIcon(buttonId, base64Data, file.name);

        if (result.success) {
          onChange({
            type: 'image',
            value: result.filename,
          });
        } else {
          alert('Failed to upload image: ' + result.error);
        }
      } catch (error) {
        console.error('Upload error:', error);
        alert('Failed to upload image');
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle emoji selection
  const handleEmojiSelect = (emoji) => {
    onChange({
      type: 'emoji',
      value: emoji,
    });
  };

  // Filter icons based on search query
  const filteredIcons = searchQuery
    ? ALL_ICONS.filter(icon =>
        icon.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : ICON_CATEGORIES[selectedCategory]?.icons || [];

  // Render current icon preview
  const renderCurrentIcon = () => {
    if (currentIcon.type === 'emoji') {
      return <span className={styles.previewEmoji}>{currentIcon.value}</span>;
    } else if (currentIcon.type === 'fontawesome') {
      const iconData = ALL_ICONS.find(i => i.name === currentIcon.value);
      if (iconData) {
        return <FontAwesomeIcon icon={iconData.icon} className={styles.previewFontAwesome} />;
      }
    } else if (currentIcon.type === 'image') {
      return <img src={uploadPreview || `icon://${currentIcon.value}`} alt="Icon" className={styles.previewImage} />;
    }
    return <span className={styles.previewEmoji}>⚡</span>;
  };

  return (
    <div className={styles.iconPicker}>
      {/* Current Selection Preview */}
      <div className={styles.currentSelection}>
        <label className={styles.label}>Current Icon</label>
        <div className={styles.preview}>
          {renderCurrentIcon()}
        </div>
      </div>

      {/* Segmented Control */}
      <div className={styles.segmentedControl}>
        <button
          type="button"
          className={`${styles.segment} ${mode === MODES.FONTAWESOME ? styles.active : ''}`}
          onClick={() => setMode(MODES.FONTAWESOME)}
        >
          Icon Library
        </button>
        <button
          type="button"
          className={`${styles.segment} ${mode === MODES.UPLOAD ? styles.active : ''}`}
          onClick={() => setMode(MODES.UPLOAD)}
        >
          Upload Image
        </button>
        <button
          type="button"
          className={`${styles.segment} ${mode === MODES.EMOJI ? styles.active : ''}`}
          onClick={() => setMode(MODES.EMOJI)}
        >
          Emoji
        </button>
        <div
          className={styles.slider}
          style={{
            left: mode === MODES.FONTAWESOME ? '0%' : mode === MODES.UPLOAD ? '33.33%' : '66.66%'
          }}
        />
      </div>

      {/* Font Awesome Mode */}
      {mode === MODES.FONTAWESOME && (
        <div className={styles.fontAwesomeMode}>
          {/* Search */}
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search icons..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {!searchQuery && (
            <>
              {/* Popular Icons */}
              <div className={styles.section}>
                <h4 className={styles.sectionTitle}>Popular</h4>
                <div className={styles.iconGrid}>
                  {POPULAR_ICONS.map((icon) => (
                    <button
                      key={icon.name}
                      type="button"
                      className={`${styles.iconButton} ${
                        currentIcon.type === 'fontawesome' && currentIcon.value === icon.name
                          ? styles.selected
                          : ''
                      }`}
                      onClick={() => handleFontAwesomeSelect(icon.name)}
                      title={icon.label}
                    >
                      <FontAwesomeIcon icon={icon.icon} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Tabs */}
              <div className={styles.categoryTabs}>
                {Object.entries(ICON_CATEGORIES).map(([key, category]) => (
                  <button
                    key={key}
                    type="button"
                    className={`${styles.categoryTab} ${
                      selectedCategory === key ? styles.active : ''
                    }`}
                    onClick={() => setSelectedCategory(key)}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Icon Grid */}
          <div className={styles.iconGrid}>
            {filteredIcons.map((icon) => (
              <button
                key={icon.name}
                type="button"
                className={`${styles.iconButton} ${
                  currentIcon.type === 'fontawesome' && currentIcon.value === icon.name
                    ? styles.selected
                    : ''
                }`}
                onClick={() => handleFontAwesomeSelect(icon.name)}
                title={icon.label}
              >
                <FontAwesomeIcon icon={icon.icon} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Upload Mode */}
      {mode === MODES.UPLOAD && (
        <div className={styles.uploadMode}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/x-icon"
            onChange={handleFileSelect}
            className={styles.fileInput}
          />

          <div
            className={styles.uploadZone}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadPreview || (currentIcon.type === 'image' && currentIcon.value) ? (
              <div className={styles.uploadedPreview}>
                <img
                  src={uploadPreview || `icon://${currentIcon.value}`}
                  alt="Uploaded icon"
                />
                <p className={styles.uploadHint}>Tap to change image</p>
              </div>
            ) : (
              <div className={styles.uploadPrompt}>
                <div className={styles.uploadIcon}>+</div>
                <p className={styles.uploadText}>Tap to select image</p>
                <p className={styles.uploadHint}>PNG, JPG, SVG, or ICO (max 512KB)</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Emoji Mode */}
      {mode === MODES.EMOJI && (
        <div className={styles.emojiMode}>
          <div className={styles.emojiGrid}>
            {COMMON_EMOJIS.map((emoji, index) => (
              <button
                key={index}
                type="button"
                className={`${styles.emojiButton} ${
                  currentIcon.type === 'emoji' && currentIcon.value === emoji
                    ? styles.selected
                    : ''
                }`}
                onClick={() => handleEmojiSelect(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Manual emoji input fallback */}
          <div className={styles.emojiInputSection}>
            <label className={styles.emojiInputLabel}>Or enter any emoji:</label>
            <input
              type="text"
              className={styles.emojiInput}
              value={currentIcon.type === 'emoji' ? currentIcon.value : ''}
              onChange={(e) => handleEmojiSelect(e.target.value)}
              placeholder="⚡"
              maxLength={4}
            />
          </div>
        </div>
      )}
    </div>
  );
}

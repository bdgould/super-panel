import { useRef, useCallback } from 'react';
import { LONG_PRESS_DURATION } from '../utils/constants';

/**
 * Hook for detecting long press (press and hold) gestures
 * @param {Function} onLongPress - Callback when long press is detected
 * @param {Object} options - Configuration options
 * @param {number} options.duration - Duration in ms for long press (default: LONG_PRESS_DURATION)
 * @param {Function} options.onPress - Callback for normal press (no long press)
 * @param {Function} options.onPressStart - Callback when press starts
 * @param {Function} options.onPressEnd - Callback when press ends
 */
export function useLongPress(onLongPress, options = {}) {
  const {
    duration = LONG_PRESS_DURATION,
    onPress,
    onPressStart,
    onPressEnd,
  } = options;

  const timerRef = useRef(null);
  const isLongPressRef = useRef(false);
  const pressStartPos = useRef({ x: 0, y: 0 });

  const start = useCallback((event) => {
    // Store initial position for movement detection
    const touch = event.touches ? event.touches[0] : event;
    pressStartPos.current = {
      x: touch.clientX,
      y: touch.clientY,
    };

    isLongPressRef.current = false;

    if (onPressStart) {
      onPressStart(event);
    }

    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      if (onLongPress) {
        onLongPress(event);
      }
    }, duration);
  }, [onLongPress, onPressStart, duration]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const end = useCallback((event) => {
    if (onPressEnd) {
      onPressEnd(event);
    }

    // If it was a long press, don't trigger normal press
    if (isLongPressRef.current) {
      cancel();
      return;
    }

    // If timer is still running, it's a normal press
    if (timerRef.current && onPress) {
      cancel();
      onPress(event);
    } else {
      cancel();
    }
  }, [onPress, onPressEnd, cancel]);

  const move = useCallback((event) => {
    // Cancel long press if finger moves too much
    const touch = event.touches ? event.touches[0] : event;
    const deltaX = Math.abs(touch.clientX - pressStartPos.current.x);
    const deltaY = Math.abs(touch.clientY - pressStartPos.current.y);

    // If movement is more than 10px, cancel long press
    if (deltaX > 10 || deltaY > 10) {
      cancel();
    }
  }, [cancel]);

  return {
    onMouseDown: start,
    onMouseUp: end,
    onMouseLeave: cancel,
    onMouseMove: move,
    onTouchStart: start,
    onTouchEnd: end,
    onTouchCancel: cancel,
    onTouchMove: move,
  };
}

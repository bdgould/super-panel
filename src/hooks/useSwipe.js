import { useRef, useCallback } from 'react';
import { SWIPE_THRESHOLD, SWIPE_VELOCITY_THRESHOLD } from '../utils/constants';

/**
 * Hook for detecting swipe gestures
 * @param {Object} options - Configuration options
 * @param {Function} options.onSwipeLeft - Callback for left swipe
 * @param {Function} options.onSwipeRight - Callback for right swipe
 * @param {Function} options.onSwipeUp - Callback for up swipe
 * @param {Function} options.onSwipeDown - Callback for down swipe
 * @param {number} options.threshold - Minimum distance for swipe (default: SWIPE_THRESHOLD)
 * @param {number} options.velocityThreshold - Minimum velocity for swipe (default: SWIPE_VELOCITY_THRESHOLD)
 */
export function useSwipe(options = {}) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = SWIPE_THRESHOLD,
    velocityThreshold = SWIPE_VELOCITY_THRESHOLD,
  } = options;

  const touchStart = useRef({ x: 0, y: 0, time: 0 });
  const touchEnd = useRef({ x: 0, y: 0, time: 0 });

  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  }, []);

  const handleTouchMove = useCallback((e) => {
    const touch = e.touches[0];
    touchEnd.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  }, []);

  const handleTouchEnd = useCallback(() => {
    const deltaX = touchEnd.current.x - touchStart.current.x;
    const deltaY = touchEnd.current.y - touchStart.current.y;
    const deltaTime = touchEnd.current.time - touchStart.current.time;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Calculate velocity
    const velocityX = absX / deltaTime;
    const velocityY = absY / deltaTime;

    // Determine if swipe is horizontal or vertical
    const isHorizontal = absX > absY;

    // Check if swipe meets threshold requirements
    if (isHorizontal && absX > threshold && velocityX > velocityThreshold) {
      if (deltaX > 0 && onSwipeRight) {
        onSwipeRight({ deltaX, deltaY, velocityX, velocityY });
      } else if (deltaX < 0 && onSwipeLeft) {
        onSwipeLeft({ deltaX, deltaY, velocityX, velocityY });
      }
    } else if (!isHorizontal && absY > threshold && velocityY > velocityThreshold) {
      if (deltaY > 0 && onSwipeDown) {
        onSwipeDown({ deltaX, deltaY, velocityX, velocityY });
      } else if (deltaY < 0 && onSwipeUp) {
        onSwipeUp({ deltaX, deltaY, velocityX, velocityY });
      }
    }

    // Reset
    touchStart.current = { x: 0, y: 0, time: 0 };
    touchEnd.current = { x: 0, y: 0, time: 0 };
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold, velocityThreshold]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
}

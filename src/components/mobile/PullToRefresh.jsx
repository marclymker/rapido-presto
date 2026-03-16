import React, { useState, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

const THRESHOLD = 70; // px to trigger refresh

export default function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const containerRef = useRef(null);

  const handleTouchStart = useCallback((e) => {
    // Only activate if scrolled to top
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (startY.current === null || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0 && containerRef.current?.scrollTop === 0) {
      e.preventDefault();
      setPullDistance(Math.min(delta * 0.5, THRESHOLD + 20));
    }
  }, [refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(THRESHOLD);
      await onRefresh();
      setRefreshing(false);
    }
    setPullDistance(0);
    startY.current = null;
  }, [pullDistance, refreshing, onRefresh]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const isTriggered = pullDistance >= THRESHOLD;

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto"
      style={{ overscrollBehavior: 'none' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-150"
        style={{ height: refreshing ? THRESHOLD : pullDistance > 0 ? pullDistance : 0 }}
      >
        {(pullDistance > 10 || refreshing) && (
          <div className={`flex items-center gap-2 text-sm font-medium transition-all ${isTriggered || refreshing ? 'text-orange-500' : 'text-slate-400'}`}>
            <Loader2
              className={`w-5 h-5 transition-transform ${refreshing ? 'animate-spin' : ''}`}
              style={{ transform: refreshing ? undefined : `rotate(${progress * 360}deg)` }}
            />
            <span>{refreshing ? 'Actualisation...' : isTriggered ? 'Relâcher' : 'Tirer pour actualiser'}</span>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
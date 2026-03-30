/**
 * Background Sync du panier
 * - Actions offline → queue localStorage
 * - À la reconnexion → flush automatique
 */

import { useEffect, useRef } from 'react';
import { useOnlineStatus } from '@/components/offline/useOnlineStatus';
import { base44 } from '@/api/base44Client';

const QUEUE_KEY = 'rp_cart_queue';

export function readQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch { return []; }
}

export function enqueueCartAction(action) {
  const queue = readQueue();
  queue.push({ ...action, queuedAt: Date.now() });
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue)); } catch {}
}

function clearQueue() {
  localStorage.removeItem(QUEUE_KEY);
}

export function useCartSync(userId) {
  const { isOnline } = useOnlineStatus();
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true;
      return;
    }

    if (!wasOffline.current) return;
    wasOffline.current = false;

    // Back online — flush queue
    const queue = readQueue();
    if (!queue.length) return;

    (async () => {
      for (const action of queue) {
        try {
          if (action.type === 'add' && userId) {
            await base44.entities.CartItem.create(action.data);
          } else if (action.type === 'remove') {
            await base44.entities.CartItem.delete(action.id);
          }
        } catch {
          // If it fails again, leave in queue for next time
          return;
        }
      }
      clearQueue();
    })();
  }, [isOnline, userId]);
}
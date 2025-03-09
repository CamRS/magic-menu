import { useEffect } from 'react';
import { queryClient } from '@/lib/queryClient';

export function useMenuUpdates(restaurantId: number | undefined) {
  useEffect(() => {
    if (!restaurantId) return;

    const eventSource = new EventSource(`/api/menu-updates/${restaurantId}`);

    eventSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);

            console.log("🔄 SSE Event:", data);

            if (data.type === 'menuUpdate') {
                console.log("📢 Menu updated! Reloading...");
                location.reload(); // 🔄 Refresh page
            }
        } catch (error) {
            console.error('❌ SSE message error:', error);
        }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [restaurantId]);
}

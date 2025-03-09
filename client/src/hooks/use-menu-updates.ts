import { useEffect } from 'react';
import { queryClient } from '@/lib/queryClient';

export function useMenuUpdates(restaurantId: number | undefined) {
  useEffect(() => {
    if (!restaurantId) return;

    const eventSource = new EventSource(`/api/menu-updates/${restaurantId}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'update') {
          // Invalidate both the menu items query and the public menu query
          queryClient.invalidateQueries({ queryKey: ['/api/menu-items', restaurantId] });
          queryClient.invalidateQueries({ queryKey: ['/api/public/menu', restaurantId] });
        }
      } catch (error) {
        console.error('Error processing SSE message:', error);
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

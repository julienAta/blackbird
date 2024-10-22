// Hook for using WebSocket subscriptions
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import webSocketManager from "@/lib/websocketManager";
export function useWebSocket<T>(
  subscriptionMethod: string,
  initialValue: T[] = []
) {
  const [data, setData] = useState<T[]>(initialValue);
  const [connectionState, setConnectionState] = useState<
    "connecting" | "connected" | "disconnected"
  >(webSocketManager.getInstance().getConnectionState());

  useEffect(() => {
    const wsManager = webSocketManager.getInstance();

    // Update initial connection state
    setConnectionState(wsManager.getConnectionState());

    // Set up connection state check interval
    const stateInterval = setInterval(() => {
      setConnectionState(wsManager.getConnectionState());
    }, 1000);

    // Subscribe to data
    const unsubscribe = wsManager.subscribe(
      subscriptionMethod,
      (newData: T) => {
        setData((prev) => [newData, ...prev].slice(0, 50));
      }
    );

    return () => {
      unsubscribe();
      clearInterval(stateInterval);
    };
  }, [subscriptionMethod]);

  return { data, connectionState };
}

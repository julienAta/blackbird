// websocketManager.ts
class WebSocketManager {
  private static instance: WebSocketManager;
  private ws: WebSocket | null = null;
  private subscribers: Map<string, Set<Function>> = new Map();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isConnecting: boolean = false;

  private constructor() {
    // Private constructor to enforce singleton
  }

  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  private setupWebSocket() {
    if (
      this.isConnecting ||
      this.ws?.readyState === WebSocket.CONNECTING ||
      this.ws?.readyState === WebSocket.OPEN
    ) {
      return;
    }

    this.isConnecting = true;

    try {
      this.ws = new WebSocket("wss://pumpportal.fun/api/data");

      this.ws.onopen = () => {
        console.log("WebSocket connected");
        this.isConnecting = false;

        // Resubscribe to all active subscriptions
        this.subscribers.forEach((_, method) => {
          this.sendSubscription(method);
        });

        // Setup health check
        this.setupHealthCheck();
      };

      this.ws.onclose = () => {
        console.log("WebSocket closed");
        this.isConnecting = false;
        this.handleDisconnection();
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        this.isConnecting = false;
        this.handleDisconnection();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error("Error parsing message:", error);
        }
      };
    } catch (error) {
      console.error("Error setting up WebSocket:", error);
      this.isConnecting = false;
      this.handleDisconnection();
    }
  }

  private handleDisconnection() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    this.reconnectTimeout = setTimeout(() => {
      this.setupWebSocket();
    }, 5000);
  }

  private setupHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    this.healthCheckInterval = setInterval(() => {
      if (this.ws?.readyState !== WebSocket.OPEN) {
        this.handleDisconnection();
      }
    }, 30000);
  }

  private sendSubscription(method: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ method }));
    }
  }

  private handleMessage(data: any) {
    // Route message to appropriate subscribers
    if (data.type === "newToken") {
      const subscribers = this.subscribers.get("subscribeNewToken");
      subscribers?.forEach((callback) => callback(data));
    }
    // Add more message type handlers as needed
  }

  public subscribe(method: string, callback: Function): () => void {
    if (!this.subscribers.has(method)) {
      this.subscribers.set(method, new Set());
      // Only send subscription if this is the first subscriber
      this.sendSubscription(method);
    }

    this.subscribers.get(method)?.add(callback);

    // Ensure connection is established
    this.setupWebSocket();

    // Return unsubscribe function
    return () => {
      const subscribers = this.subscribers.get(method);
      subscribers?.delete(callback);

      // If no more subscribers for this method, unsubscribe from server
      if (subscribers?.size === 0) {
        this.subscribers.delete(method);
        if (this.ws?.readyState === WebSocket.OPEN) {
          const unsubMethod = method.replace("subscribe", "unsubscribe");
          this.ws.send(JSON.stringify({ method: unsubMethod }));
        }
      }
    };
  }

  public getConnectionState(): "connecting" | "connected" | "disconnected" {
    if (this.isConnecting) return "connecting";
    return this.ws?.readyState === WebSocket.OPEN
      ? "connected"
      : "disconnected";
  }

  public reconnect() {
    if (this.ws) {
      this.ws.close();
    }
    this.setupWebSocket();
  }
}

export default WebSocketManager;

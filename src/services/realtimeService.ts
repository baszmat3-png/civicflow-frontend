import { API_BASE_URL } from './apiClient';

export type RealtimeEventType =
  | 'connected'
  | 'new_request'
  | 'request_updated'
  | 'request_deleted'
  | 'new_appointment'
  | 'appointment_updated'
  | 'new_rating';

type RealtimeCallback = (data: any) => void;

class FrontendRealtimeService {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<RealtimeCallback>> = new Map();
  private reconnectTimeout: any = null;
  private isConnected = false;
  private retryCount = 0;

  public init() {
    if (typeof window === 'undefined') return;
    if (this.eventSource) return;

    this.connect();

    // Reconnect on tab focus or when network comes online
    window.addEventListener('online', () => this.reconnect());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !this.isConnected) {
        this.reconnect();
      }
    });
  }

  private connect() {
    try {
      const streamUrl = `${API_BASE_URL}/realtime/stream`;
      this.eventSource = new EventSource(streamUrl);

      this.eventSource.onopen = () => {
        this.isConnected = true;
        this.retryCount = 0;
        console.log('⚡ [Realtime SSE] Connected to live updates stream');
        this.emitLocal('connected', { timestamp: new Date().toISOString() });
      };

      // Built-in listeners for each event
      const events: RealtimeEventType[] = [
        'new_request',
        'request_updated',
        'request_deleted',
        'new_appointment',
        'appointment_updated',
        'new_rating'
      ];

      events.forEach((eventName) => {
        this.eventSource?.addEventListener(eventName, (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            console.log(`🔔 [Realtime SSE] Received event '${eventName}':`, data);
            this.emitLocal(eventName, data);

            // Also dispatch window custom event for global decoupled reactions
            window.dispatchEvent(new CustomEvent(`civicflow_${eventName}`, { detail: data }));
            window.dispatchEvent(new CustomEvent('civicflow_realtime_data_change', { detail: { event: eventName, data } }));
          } catch (err) {
            console.warn(`⚠️ [Realtime SSE] Error parsing event '${eventName}':`, err);
          }
        });
      });

      this.eventSource.onerror = () => {
        this.isConnected = false;
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }

        // Exponential backoff reconnect
        const delay = Math.min(1000 * Math.pow(1.5, this.retryCount), 30000);
        this.retryCount++;
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(() => {
          this.connect();
        }, delay);
      };
    } catch (err) {
      console.warn('⚠️ [Realtime SSE] Failed to initialize EventSource:', err);
    }
  }

  public reconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.retryCount = 0;
    this.connect();
  }

  public subscribe(event: RealtimeEventType | string, callback: RealtimeCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Auto-init if not already initialized
    this.init();

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emitLocal(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.error(`Error in realtime callback for ${event}:`, e);
        }
      });
    }
  }

  public disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnected = false;
  }
}

export const realtimeService = new FrontendRealtimeService();

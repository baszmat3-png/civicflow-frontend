import { Request, Response } from 'express';

class RealtimeService {
  private clients: Set<Response> = new Set();

  constructor() {
    // Periodic cleanup / heartbeat to keep connections alive across NAT/proxies
    setInterval(() => {
      this.sendHeartbeat();
    }, 25000);
  }

  public addClient(req: Request, res: Response) {
    // Set headers for Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering in NGINX / Render reverse proxies

    // Flush headers if method exists
    if (typeof (res as any).flushHeaders === 'function') {
      (res as any).flushHeaders();
    }

    this.clients.add(res);
    console.log(`🔌 [SSE] New client connected. Active subscribers: ${this.clients.size}`);

    // Send initial handshake
    res.write(`event: connected\ndata: ${JSON.stringify({ message: 'Connected to CivicFlow Realtime Stream', timestamp: new Date().toISOString() })}\n\n`);

    const cleanup = () => {
      if (this.clients.has(res)) {
        this.clients.delete(res);
        console.log(`🔌 [SSE] Client disconnected. Active subscribers: ${this.clients.size}`);
      }
    };

    req.on('close', cleanup);
    req.on('end', cleanup);
    res.on('finish', cleanup);
    res.on('error', cleanup);
  }

  private sendHeartbeat() {
    if (this.clients.size === 0) return;
    for (const client of this.clients) {
      try {
        client.write(': ping\n\n');
      } catch (err) {
        this.clients.delete(client);
      }
    }
  }

  public broadcast(event: string, payload: any) {
    if (this.clients.size === 0) return;

    const message = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
    console.log(`📡 [SSE Broadcast] Event: ${event} -> sending to ${this.clients.size} client(s)`);

    for (const client of this.clients) {
      try {
        client.write(message);
      } catch (err) {
        this.clients.delete(client);
      }
    }
  }

  public notifyNewRequest(requestData: any) {
    this.broadcast('new_request', {
      id: requestData.id,
      requestNumber: requestData.requestNumber,
      title: requestData.title,
      customerName: requestData.customer?.name || requestData.customerName || 'مراجع',
      phone: requestData.customer?.phone || requestData.phone,
      ministryName: requestData.ministry?.name || requestData.ministryName,
      status: requestData.status || 'قيد المراجعة',
      priority: requestData.priority || 'عادي',
      createdAt: new Date().toISOString(),
      source: requestData.source || 'portal'
    });
  }

  public notifyRequestUpdated(requestData: any) {
    this.broadcast('request_updated', {
      id: requestData.id,
      requestNumber: requestData.requestNumber,
      status: requestData.status,
      updatedAt: new Date().toISOString()
    });
  }

  public notifyNewAppointment(appointmentData: any) {
    this.broadcast('new_appointment', {
      id: appointmentData.id,
      customerName: appointmentData.customerName,
      phone: appointmentData.phone,
      appointmentDate: appointmentData.appointmentDate,
      timeSlot: appointmentData.timeSlot,
      status: appointmentData.status || 'PENDING',
      createdAt: new Date().toISOString()
    });
  }

  public notifyAppointmentUpdated(appointmentData: any) {
    this.broadcast('appointment_updated', {
      id: appointmentData.id,
      status: appointmentData.status,
      updatedAt: new Date().toISOString()
    });
  }

  public notifyNewRating(ratingData: any) {
    this.broadcast('new_rating', {
      id: ratingData.id,
      citizenName: ratingData.citizenName,
      score: ratingData.score,
      comment: ratingData.comment,
      createdAt: new Date().toISOString()
    });
  }
}

export const realtimeService = new RealtimeService();

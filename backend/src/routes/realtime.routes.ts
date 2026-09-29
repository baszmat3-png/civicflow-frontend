import { Router, Request, Response } from 'express';
import { realtimeService } from '../services/realtime.service.js';

export const realtimeRouter = Router();

// GET /api/realtime/stream or /api/events
realtimeRouter.get('/stream', (req: Request, res: Response) => {
  realtimeService.addClient(req, res);
});

realtimeRouter.get('/events', (req: Request, res: Response) => {
  realtimeService.addClient(req, res);
});

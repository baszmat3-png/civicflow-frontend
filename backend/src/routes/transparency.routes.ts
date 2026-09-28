import { Router } from 'express';
import { getPublicTransparencyStats } from '../controllers/transparency.controller.js';

export const transparencyRouter = Router();

transparencyRouter.get('/public', getPublicTransparencyStats);

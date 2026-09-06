import { Router } from 'express';
import healthRouter from './health.js';
import authRouter from './auth.js';
import wellsRouter from './wells.js';
import eventsRouter from './events.js';
import documentsRouter from './documents.js';
import searchRouter from './search.js';
import assistantRouter from './assistant.js';
import riskRouter from './risk.js';
import alertsRouter from './alerts.js';
import streamRouter from './stream.js';

const router = Router();

router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/wells', wellsRouter);
router.use('/events', eventsRouter);
router.use('/documents', documentsRouter);
router.use('/search', searchRouter);
router.use('/assistant', assistantRouter);
router.use('/risk', riskRouter);
router.use('/alerts', alertsRouter);
router.use('/stream', streamRouter);

export default router;

import express from 'express';
import * as notifController from '../controllers/notifications.controller.js';
import { authMiddleware, authorize as requireRole } from '../middlewares/auth.js';
import validate from '../middlewares/validate.js';
import { createNotificationSchema, markNotificationReadSchema } from '../utils/schemas.js';

const router = express.Router();

router.get('/', authMiddleware, notifController.getNotifications);
router.put('/:id/read', authMiddleware, notifController.markRead);
router.put('/read-all', authMiddleware, validate(markNotificationReadSchema), notifController.markAllRead);
router.post('/', authMiddleware, requireRole(['manager', 'serveur', 'cuisinier', 'barman', 'livreur']), validate(createNotificationSchema), notifController.createNotification);

export default router;

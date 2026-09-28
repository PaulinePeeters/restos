import express from 'express';
import * as reservationController from '../controllers/reservations.controller.js';
import { authMiddleware, authorize } from '../middlewares/auth.js';
import validate from '../middlewares/validate.js';
import { createReservationSchema, updateReservationSchema } from '../utils/schemas.js';

const router = express.Router();

// Public ou Client auth pour créer ?
// Ici on suppose que tout le monde peut créer, mais si auth, on remplit le client_id
router.get('/', authMiddleware, authorize(['manager', 'serveur']), reservationController.getAllReservations);
router.get('/client/:clientId', authMiddleware, authorize(['manager', 'serveur', 'client']), reservationController.getReservationsByClient);
router.post('/', validate(createReservationSchema), reservationController.createReservation);
router.put('/:id', authMiddleware, authorize(['manager']), validate(updateReservationSchema), reservationController.updateReservation);
router.delete('/:id', authMiddleware, authorize(['manager']), reservationController.deleteReservation);
router.patch('/:id/cancel', authMiddleware, authorize(['manager', 'client']), reservationController.cancelReservation);

export default router;

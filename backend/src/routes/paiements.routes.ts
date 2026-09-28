import express from 'express';
import { processPayment, splitBill, getReceipt } from '../controllers/paiements.controller.js';
import { authMiddleware, authorize } from '../middlewares/auth.js';
import validate from '../middlewares/validate.js';
import { addPaiementSchema, splitBillSchema } from '../utils/schemas.js';

const router = express.Router();

router.use(authMiddleware, authorize(['manager', 'super_admin', 'serveur']));
router.post('/:commandeId', validate(addPaiementSchema), processPayment);
router.post('/:commandeId/split', validate(splitBillSchema), splitBill);
router.get('/:commandeId/recu', getReceipt);

export default router;

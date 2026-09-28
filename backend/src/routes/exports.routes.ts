import express from 'express';
import { getDailyTransactionsCSV, getDailyLignesCSV, getDailySummary } from '../controllers/exports.controller.js';
import { authMiddleware, authorize as requireRole } from '../middlewares/auth.js';
import validate from '../middlewares/validate.js';
import { exportQuerySchema } from '../utils/schemas.js';
import { sendEmail } from '../utils/mailer.js';

const router = express.Router();

router.get('/transactions', authMiddleware, requireRole(['manager']), validate(exportQuerySchema, 'query'), getDailyTransactionsCSV);
router.get('/details', authMiddleware, requireRole(['manager']), validate(exportQuerySchema, 'query'), getDailyLignesCSV);
router.get('/summary', authMiddleware, requireRole(['manager']), validate(exportQuerySchema, 'query'), getDailySummary);

export default router;

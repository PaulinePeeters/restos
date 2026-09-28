import express from 'express';
import * as sessionController from '../controllers/sessions.controller.js';

const router = express.Router();

router.post('/', sessionController.createSession);
router.put('/', sessionController.closeSession);
router.put('/ready', sessionController.markTableReady);
router.put('/couverts', sessionController.updateCovers);
router.get('/', sessionController.getAllTablesWithSessions);
router.get('/menu-access', sessionController.handleMenuAccess);

export default router;

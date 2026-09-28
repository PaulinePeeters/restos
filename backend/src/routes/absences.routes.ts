import express from 'express';
import * as absenceController from '../controllers/absences.controller.js';

import validate from '../middlewares/validate.js';
import { createAbsenceSchema, updateAbsenceSchema } from '../utils/schemas.js';

const router = express.Router();

router.get('/', absenceController.listAbsences);
router.post('/', validate(createAbsenceSchema), absenceController.createAbsence);
router.patch('/:id', validate(updateAbsenceSchema), absenceController.updateAbsence);
router.delete('/:id', absenceController.deleteAbsence);

export default router;

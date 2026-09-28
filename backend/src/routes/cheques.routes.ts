import express from 'express';
import { createCheque, getAllCheques, validateCheque, deleteCheque, useCheque, sendChequeEmail } from '../controllers/cheques.controller.js';
import validate from '../middlewares/validate.js';
import { createChequeSchema, validateChequeSchema, useChequeSchema } from '../utils/schemas.js';

const router = express.Router();


router.get('/', getAllCheques);
router.post('/', validate(createChequeSchema), createCheque);
router.post('/validate', validate(validateChequeSchema), validateCheque);
router.post('/use', validate(useChequeSchema), useCheque);
router.delete('/:id', deleteCheque);
router.post('/:id/send', sendChequeEmail);

export default router;

import express from 'express';
import * as typesCongeController from '../controllers/typesconge.controller.js';

const router = express.Router();

router.get('/', typesCongeController.listTypes);

export default router;

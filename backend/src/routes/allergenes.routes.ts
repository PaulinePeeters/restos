import express from 'express';
import * as allergenesController from '../controllers/allergenes.controller.js';

const router = express.Router();

router.get('/', allergenesController.getAllergenes);

export default router;

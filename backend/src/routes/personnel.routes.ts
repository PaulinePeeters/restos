import express from 'express';
import * as personnelController from '../controllers/personnel.controller.js';
import { authMiddleware, authorize } from '../middlewares/auth.js';

import validate from '../middlewares/validate.js';
import { createPersonnelSchema, personnelLoginSchema } from '../utils/schemas.js';

const router = express.Router();

router.post('/login', validate(personnelLoginSchema), personnelController.loginPersonnel);
router.use(authMiddleware);

router.get('/', authorize(['manager']), personnelController.getAllPersonnels);
router.get('/actifs', personnelController.getPersonnelsActifs);
router.get('/:id', personnelController.getPersonnelById);

router.post('/', authorize(['manager', 'super_admin']), validate(createPersonnelSchema), personnelController.createPersonnel);
router.put('/:id', authorize(['manager', 'super_admin']), personnelController.updatePersonnel);
router.delete('/:id', authorize(['manager', 'super_admin']), personnelController.deletePersonnel);

export default router;

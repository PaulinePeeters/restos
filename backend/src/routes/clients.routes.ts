import express from 'express';
import * as clientController from '../controllers/clients.controller.js';
import { authMiddleware, authorize } from '../middlewares/auth.js';
import validate from '../middlewares/validate.js';
import { registerClientSchema, loginSchema, updateClientAddressSchema, updateProfileSchema } from '../utils/schemas.js';

const router = express.Router();

router.post('/login', validate(loginSchema), clientController.loginClient);
router.post('/register', validate(registerClientSchema), clientController.registerClient);
router.get('/me', authMiddleware, clientController.getClientMe);
router.put('/me/address', authMiddleware, validate(updateClientAddressSchema), clientController.updateAddress);
router.put('/me/profile', authMiddleware, validate(updateProfileSchema), clientController.updateProfile);

// Routes Manager CRM
router.get('/', authMiddleware, authorize(['manager']), clientController.getAllClients);
router.delete('/:id', authMiddleware, authorize(['manager']), clientController.deleteClient);

export default router;

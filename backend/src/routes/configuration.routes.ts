import express from 'express';
import { getConfig, updateConfig, getAllConfig, updateConfigs } from '../controllers/configuration.controller.js';
import { uploadLogoController } from '../controllers/upload.controller.js';
import { upload } from '../middlewares/upload.middleware.js';
import { authMiddleware, authorize } from '../middlewares/auth.js';
import validate from '../middlewares/validate.js';
import { updateConfigSchema, updateConfigsSchema } from '../utils/schemas.js';

const router = express.Router();

router.get('/', getAllConfig);
router.get('/:cle', getConfig);
router.use(authMiddleware, authorize(['super_admin', 'manager']));
router.post('/', validate(updateConfigSchema), updateConfig);
router.post('/bulk', validate(updateConfigsSchema), updateConfigs);
router.post('/logo', upload.single('logo'), uploadLogoController);

export default router;

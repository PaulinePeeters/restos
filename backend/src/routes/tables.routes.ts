import express from 'express';
import tablesController from '../controllers/tables.controller.js';
import validate from '../middlewares/validate.js';
import { fusionnerTablesSchema, defusionnerTablesSchema } from '../utils/schemas.js';

const router = express.Router();

router.get('/', tablesController.getAllTables);
router.get('/available', tablesController.getAvailableTables);
router.put('/:id', tablesController.updateTable);
router.post('/batch', tablesController.updateTablesBatch);
router.post('/fusion', validate(fusionnerTablesSchema), tablesController.fusionnerTables);
router.post('/defusion', validate(defusionnerTablesSchema), tablesController.defusionnerTables);
router.post('/', tablesController.createTable);
router.delete('/:id', tablesController.deleteTable);
router.post('/:id/fire', tablesController.fireNextCourse);
router.get('/:id/qrcode', tablesController.getQRCode);

export default router;

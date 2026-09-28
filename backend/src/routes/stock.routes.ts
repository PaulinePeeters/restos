import express from 'express';
import { stockController } from '../controllers/stock.controller.js';

const router = express.Router();

router.get('/shopping-list', stockController.getShoppingList); 
router.get('/food-cost/:platId', stockController.getFoodCost); 
router.put('/ingredient/:id/cost', stockController.updateIngredientCost); 

router.get('/', stockController.getAllStock); 
router.get('/:id', stockController.getStockByIngredientId); 
router.put('/:id', stockController.updateStockQuantity); 
router.post('/', stockController.createStock); 
router.delete('/:id', stockController.deleteStock); 

export default router;

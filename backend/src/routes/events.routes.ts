import express from 'express';
import { getAllEvents, createEvent, updateEvent, deleteEvent, getActiveEvent } from '../controllers/events.controller.js';
import { upload } from '../middlewares/upload.middleware.js';
import validate from '../middlewares/validate.js';
import { createEventSchema, updateEventSchema } from '../utils/schemas.js';

const router = express.Router();

router.get('/', getAllEvents);
router.get('/active', getActiveEvent);
router.post('/', upload.single('image'), validate(createEventSchema), createEvent);
router.put('/:id', upload.single('image'), validate(updateEventSchema), updateEvent);
router.delete('/:id', deleteEvent);

export default router;

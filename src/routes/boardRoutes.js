import express from 'express';
import columnRoutes from './columnRoutes.js';
import { createBoard, getBoardById } from '../controllers/boardController.js';
import { validateObjectId } from '../middleware/validateObjectId.js';

const router = express.Router();

// Enrutamiento anidado hacia columnas: /api/boards/:boardId/columns
router.use('/:boardId/columns', columnRoutes);

// POST /api/boards
router.post('/', createBoard);

// GET /api/boards/:boardId
router.get('/:boardId', validateObjectId('boardId'), getBoardById);

export default router;

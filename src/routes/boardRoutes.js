import express from 'express';
import columnRoutes from './columnRoutes.js';
import { createBoard, getBoardById, deleteBoard } from '../controllers/boardController.js';
import { validateObjectId } from '../middleware/validateObjectId.js';
import { checkBoardExists } from '../middleware/parentCheck.js';

const router = express.Router();

// Enrutamiento anidado hacia columnas: /api/boards/:boardId/columns
router.use('/:boardId/columns', columnRoutes);

// POST /api/boards
router.post('/', createBoard);

// GET /api/boards/:boardId
router.get('/:boardId', validateObjectId('boardId'), getBoardById);

// DELETE /api/boards/:boardId (borrado en cascada)
router.delete('/:boardId', validateObjectId('boardId'), checkBoardExists, deleteBoard);

export default router;

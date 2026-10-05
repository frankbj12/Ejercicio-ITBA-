import express from 'express';
import ticketRoutes from './ticketRoutes.js';
import { createColumn, deleteColumn } from '../controllers/columnController.js';
import { validateObjectId } from '../middleware/validateObjectId.js';
import { checkBoardExists, checkColumnInBoard } from '../middleware/parentCheck.js';

const router = express.Router({ mergeParams: true });

// Enrutamiento anidado hacia tickets: /api/boards/:boardId/columns/:columnId/tickets
router.use('/:columnId/tickets', ticketRoutes);

// POST /api/boards/:boardId/columns
router.post(
  '/',
  validateObjectId('boardId'),
  checkBoardExists,
  createColumn
);

// DELETE /api/boards/:boardId/columns/:columnId
router.delete(
  '/:columnId',
  validateObjectId('boardId', 'columnId'),
  checkBoardExists,
  checkColumnInBoard,
  deleteColumn
);

export default router;

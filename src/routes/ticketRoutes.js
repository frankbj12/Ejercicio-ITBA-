import express from 'express';
import { createTicket, updateTicket } from '../controllers/ticketController.js';
import { validateObjectId } from '../middleware/validateObjectId.js';
import {
  checkBoardExists,
  checkColumnInBoard,
  checkTicketInColumn
} from '../middleware/parentCheck.js';

const router = express.Router({ mergeParams: true });

// POST /api/boards/:boardId/columns/:columnId/tickets
router.post(
  '/',
  validateObjectId('boardId', 'columnId'),
  checkBoardExists,
  checkColumnInBoard,
  createTicket
);

// PATCH /api/boards/:boardId/columns/:columnId/tickets/:ticketId
router.patch(
  '/:ticketId',
  validateObjectId('boardId', 'columnId', 'ticketId'),
  checkBoardExists,
  checkColumnInBoard,
  checkTicketInColumn,
  updateTicket
);

export default router;

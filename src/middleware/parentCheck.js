import Board from '../models/Board.js';
import Column from '../models/Column.js';
import Ticket from '../models/Ticket.js';

/**
 * Verifica que el tablero exista (req.params.boardId).
 */
export async function checkBoardExists(req, res, next) {
  try {
    const { boardId } = req.params;
    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ error: 'Tablero no encontrado' });
    }
    req.board = board;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Verifica que la columna exista (req.params.columnId).
 */
export async function checkColumnExists(req, res, next) {
  try {
    const { columnId } = req.params;
    const column = await Column.findById(columnId);
    if (!column) {
      return res.status(404).json({ error: 'Columna no encontrada' });
    }
    req.column = column;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Verifica que la columna exista y pertenezca estrictamente al tablero indicado (Aislamiento de rutas).
 */
export async function checkColumnInBoard(req, res, next) {
  try {
    const { boardId, columnId } = req.params;

    // Verificar tablero si aún no fue verificado
    if (!req.board) {
      const board = await Board.findById(boardId);
      if (!board) {
        return res.status(404).json({ error: 'Tablero no encontrado' });
      }
      req.board = board;
    }

    // Verificar columna si aún no fue verificada
    const column = req.column || await Column.findById(columnId);
    if (!column) {
      return res.status(404).json({ error: 'Columna no encontrada' });
    }
    req.column = column;

    // Verificar relación padre-hijo
    if (column.board.toString() !== boardId.toString()) {
      return res.status(404).json({
        error: 'La columna no pertenece al tablero indicado'
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Verifica que el ticket exista y pertenezca estrictamente a la columna indicada.
 */
export async function checkTicketInColumn(req, res, next) {
  try {
    const { columnId, ticketId } = req.params;

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    if (ticket.column.toString() !== columnId.toString()) {
      return res.status(404).json({
        error: 'El ticket no pertenece a la columna indicada'
      });
    }

    req.ticket = ticket;
    next();
  } catch (error) {
    next(error);
  }
}

import Board from '../models/Board.js';

/**
 * POST /api/boards
 * Crea un nuevo tablero.
 * Respuesta: 201 Created
 */
export async function createBoard(req, res, next) {
  try {
    const { title } = req.body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'El título del tablero es obligatorio' });
    }

    const board = await Board.create({ title });
    res.status(201).json(board);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/boards/:boardId
 * Obtiene un tablero por ID con sus columnas y tickets poblados.
 * Respuesta: 200 OK
 */
export async function getBoardById(req, res, next) {
  try {
    const { boardId } = req.params;
    const board = await Board.findById(boardId).populate({
      path: 'columns',
      populate: { path: 'tickets' }
    });

    if (!board) {
      return res.status(404).json({ error: 'Tablero no encontrado' });
    }

    res.status(200).json(board);
  } catch (error) {
    next(error);
  }
}

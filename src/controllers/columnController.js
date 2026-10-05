import Column from '../models/Column.js';

/**
 * POST /api/boards/:boardId/columns
 * Crea una columna dentro de un tablero.
 * Respuesta: 201 Created
 */
export async function createColumn(req, res, next) {
  try {
    const { boardId } = req.params;
    const { title } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'El título de la columna es obligatorio' });
    }

    const column = await Column.create({
      title,
      board: boardId
    });

    res.status(201).json(column);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/boards/:boardId/columns/:columnId
 * Elimina una columna y sus tickets dependientes en cascada.
 * Respuesta: 204 No Content
 */
export async function deleteColumn(req, res, next) {
  try {
    const column = req.column || await Column.findById(req.params.columnId);
    if (!column) {
      return res.status(404).json({ error: 'Columna no encontrada' });
    }

    await column.deleteOne();

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

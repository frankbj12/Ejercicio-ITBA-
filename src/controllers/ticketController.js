import mongoose from 'mongoose';
import Ticket from '../models/Ticket.js';
import Column from '../models/Column.js';

/**
 * POST /api/boards/:boardId/columns/:columnId/tickets
 * Crea un ticket dentro de una columna.
 * Respuesta: 201 Created
 */
export async function createTicket(req, res, next) {
  try {
    const { columnId } = req.params;
    const { title, description } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'El título del ticket es obligatorio' });
    }

    const ticket = await Ticket.create({
      title,
      description: typeof description === 'string' ? description : '',
      column: columnId
    });

    res.status(201).json(ticket);
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/boards/:boardId/columns/:columnId/tickets/:ticketId
 * Actualiza el contenido de un ticket y/o lo mueve de columna.
 * Operación idempotente.
 * Respuesta: 200 OK
 */
export async function updateTicket(req, res, next) {
  try {
    const { boardId } = req.params;
    const ticket = req.ticket || await Ticket.findById(req.params.ticketId);

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    const allowedFields = ['title', 'description', 'column', 'columnId', 'targetColumnId'];
    const receivedFields = Object.keys(req.body);

    // Si se enviaron campos no permitidos
    const invalidFields = receivedFields.filter(field => !allowedFields.includes(field));
    if (invalidFields.length > 0) {
      return res.status(400).json({
        error: `Campos no permitidos para actualización: ${invalidFields.join(', ')}`
      });
    }

    const { title, description } = req.body;
    const targetColumnId = req.body.column || req.body.columnId || req.body.targetColumnId;

    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ error: 'El título del ticket no puede estar vacío' });
      }
      ticket.title = title.trim();
    }

    if (description !== undefined) {
      if (typeof description !== 'string') {
        return res.status(400).json({ error: 'La descripción debe ser una cadena de texto' });
      }
      ticket.description = description.trim();
    }

    // Mover de columna si se especificó una nueva columna
    if (targetColumnId !== undefined) {
      if (!mongoose.isValidObjectId(targetColumnId)) {
        return res.status(400).json({
          error: `El identificador '${targetColumnId}' para la columna de destino no es un ObjectId válido`
        });
      }

      const targetColumn = await Column.findById(targetColumnId);
      if (!targetColumn) {
        return res.status(404).json({ error: 'La columna de destino no existe' });
      }

      if (targetColumn.board.toString() !== boardId.toString()) {
        return res.status(404).json({
          error: 'La columna de destino no pertenece al tablero actual'
        });
      }

      ticket.column = targetColumn._id;
    }

    await ticket.save();

    res.status(200).json(ticket);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/boards/:boardId/columns/:columnId/tickets/:ticketId
 * Elimina un ticket individual.
 * Respuesta: 204 No Content
 */
export async function deleteTicket(req, res, next) {
  try {
    const ticket = req.ticket || await Ticket.findById(req.params.ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    await ticket.deleteOne();

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

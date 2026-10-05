import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { connectTestDB, closeTestDB, clearTestDB } from './setup.js';
import Board from '../src/models/Board.js';
import Column from '../src/models/Column.js';
import Ticket from '../src/models/Ticket.js';
import { validateObjectId } from '../src/middleware/validateObjectId.js';
import {
  checkBoardExists,
  checkColumnExists,
  checkColumnInBoard,
  checkTicketInColumn
} from '../src/middleware/parentCheck.js';
import errorHandler from '../src/middleware/errorHandler.js';

describe('Fase 2: Middlewares de Validación, Padres, Aislamiento y Errores', () => {
  beforeAll(async () => {
    await connectTestDB();
  }, 30000);

  afterAll(async () => {
    await closeTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  describe('validateObjectId', () => {
    const app = express();
    app.get('/test/:boardId', validateObjectId('boardId'), (req, res) => {
      res.status(200).json({ ok: true });
    });

    it('debe permitir continuar si el ObjectId es válido', async () => {
      const validId = new mongoose.Types.ObjectId().toString();
      const res = await request(app).get(`/test/${validId}`);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    it('debe responder 400 Bad Request si el ObjectId tiene formato inválido', async () => {
      const res = await request(app).get('/test/123-invalido');
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/no es un ObjectId válido/i);
    });
  });

  describe('parentCheck & Route Isolation', () => {
    const app = express();
    app.use(express.json());

    app.get(
      '/api/boards/:boardId/columns/:columnId/tickets/:ticketId',
      validateObjectId('boardId', 'columnId', 'ticketId'),
      checkBoardExists,
      checkColumnInBoard,
      checkTicketInColumn,
      (req, res) => {
        res.status(200).json({
          board: req.board._id,
          column: req.column._id,
          ticket: req.ticket._id
        });
      }
    );
    app.use(errorHandler);

    it('debe responder 404 si el tablero no existe', async () => {
      const nonExistentBoardId = new mongoose.Types.ObjectId().toString();
      const colId = new mongoose.Types.ObjectId().toString();
      const ticketId = new mongoose.Types.ObjectId().toString();

      const res = await request(app).get(
        `/api/boards/${nonExistentBoardId}/columns/${colId}/tickets/${ticketId}`
      );
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/tablero no encontrado/i);
    });

    it('debe responder 404 si la columna no existe', async () => {
      const board = await Board.create({ title: 'Tablero A' });
      const nonExistentColId = new mongoose.Types.ObjectId().toString();
      const ticketId = new mongoose.Types.ObjectId().toString();

      const res = await request(app).get(
        `/api/boards/${board._id}/columns/${nonExistentColId}/tickets/${ticketId}`
      );
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/columna no encontrada/i);
    });

    it('debe responder 404 si la columna pertenece a OTRO tablero (aislamiento de rutas)', async () => {
      const board1 = await Board.create({ title: 'Tablero 1' });
      const board2 = await Board.create({ title: 'Tablero 2' });
      const columnOfBoard2 = await Column.create({ title: 'Columna B', board: board2._id });
      const ticketId = new mongoose.Types.ObjectId().toString();

      // Intentar acceder a la columna del tablero 2 a través de la ruta del tablero 1
      const res = await request(app).get(
        `/api/boards/${board1._id}/columns/${columnOfBoard2._id}/tickets/${ticketId}`
      );
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/la columna no pertenece al tablero indicado/i);
    });

    it('debe responder 404 si el ticket pertenece a OTRA columna', async () => {
      const board = await Board.create({ title: 'Tablero 1' });
      const col1 = await Column.create({ title: 'Columna 1', board: board._id });
      const col2 = await Column.create({ title: 'Columna 2', board: board._id });
      const ticketInCol2 = await Ticket.create({ title: 'Ticket en Col 2', column: col2._id });

      // Intentar acceder al ticket de col2 a través de la ruta de col1
      const res = await request(app).get(
        `/api/boards/${board._id}/columns/${col1._id}/tickets/${ticketInCol2._id}`
      );
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/el ticket no pertenece a la columna indicada/i);
    });

    it('debe responder 200 cuando toda la jerarquía padre-hijo es correcta', async () => {
      const board = await Board.create({ title: 'Tablero Correcto' });
      const col = await Column.create({ title: 'Columna Correcta', board: board._id });
      const ticket = await Ticket.create({ title: 'Ticket Correcto', column: col._id });

      const res = await request(app).get(
        `/api/boards/${board._id}/columns/${col._id}/tickets/${ticket._id}`
      );
      expect(res.status).toBe(200);
      expect(res.body.board).toBe(board._id.toString());
      expect(res.body.column).toBe(col._id.toString());
      expect(res.body.ticket).toBe(ticket._id.toString());
    });
  });

  describe('errorHandler', () => {
    const app = express();
    app.use(express.json());

    app.get('/error/validation', (req, res, next) => {
      const err = new mongoose.Error.ValidationError();
      err.errors = {
        title: { message: 'El título es obligatorio' }
      };
      next(err);
    });

    app.get('/error/cast', (req, res, next) => {
      const err = new mongoose.Error.CastError('ObjectId', 'valorInvalido', 'boardId');
      next(err);
    });

    app.get('/error/unexpected', (req, res, next) => {
      next(new Error('Fallo crítico interno'));
    });

    app.use(errorHandler);

    it('debe transformar ValidationError en 400 con JSON', async () => {
      const res = await request(app).get('/error/validation');
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('El título es obligatorio');
    });

    it('debe transformar CastError en 400 con JSON', async () => {
      const res = await request(app).get('/error/cast');
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/formato inválido para el campo/i);
    });

    it('debe manejar errores inesperados con 500 y mensaje genérico sin filtrar stack traces', async () => {
      const res = await request(app).get('/error/unexpected');
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Error interno del servidor');
      expect(res.body.stack).toBeUndefined();
    });
  });
});

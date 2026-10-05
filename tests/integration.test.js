import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { connectTestDB, closeTestDB, clearTestDB } from './setup.js';
import app from '../src/app.js';
import Board from '../src/models/Board.js';
import Column from '../src/models/Column.js';
import Ticket from '../src/models/Ticket.js';

describe('Fase 6: Pruebas de Integración End-to-End de la API Kanban', () => {
  beforeAll(async () => {
    await connectTestDB();
  }, 30000);

  afterAll(async () => {
    await closeTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  describe('1. POST /api/boards', () => {
    it('Happy path: debe crear un tablero y responder 201 Created', async () => {
      const res = await request(app)
        .post('/api/boards')
        .send({ title: 'Tablero Principal' });

      expect(res.status).toBe(201);
      expect(res.body._id).toBeDefined();
      expect(res.body.title).toBe('Tablero Principal');
    });

    it('Failure path: debe responder 400 si falta el título', async () => {
      const res = await request(app)
        .post('/api/boards')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/el título del tablero es obligatorio/i);
    });

    it('Failure path: debe responder 400 si el título contiene solo espacios en blanco', async () => {
      const res = await request(app)
        .post('/api/boards')
        .send({ title: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/el título del tablero es obligatorio/i);
    });
  });

  describe('2. GET /api/boards/:boardId', () => {
    it('Happy path: debe obtener el tablero con columnas y tickets poblados (200 OK)', async () => {
      const board = await Board.create({ title: 'Tablero para lectura' });
      const col = await Column.create({ title: 'To Do', board: board._id });
      const ticket = await Ticket.create({
        title: 'Primer Ticket',
        description: 'Detalles',
        column: col._id
      });

      const res = await request(app).get(`/api/boards/${board._id}`);

      expect(res.status).toBe(200);
      expect(res.body._id).toBe(board._id.toString());
      expect(res.body.title).toBe('Tablero para lectura');
      expect(Array.isArray(res.body.columns)).toBe(true);
      expect(res.body.columns).toHaveLength(1);
      expect(res.body.columns[0]._id).toBe(col._id.toString());
      expect(res.body.columns[0].tickets).toHaveLength(1);
      expect(res.body.columns[0].tickets[0].title).toBe('Primer Ticket');
    });

    it('Failure path: debe responder 404 si el tablero no existe', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app).get(`/api/boards/${nonExistentId}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/tablero no encontrado/i);
    });

    it('Failure path: debe responder 400 si el ID tiene formato inválido', async () => {
      const res = await request(app).get('/api/boards/formato-invalido');

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/no es un ObjectId válido/i);
    });
  });

  describe('3. POST /api/boards/:boardId/columns', () => {
    it('Happy path: debe crear una columna en el tablero y responder 201 Created', async () => {
      const board = await Board.create({ title: 'Tablero Columnas' });

      const res = await request(app)
        .post(`/api/boards/${board._id}/columns`)
        .send({ title: 'En Progreso' });

      expect(res.status).toBe(201);
      expect(res.body._id).toBeDefined();
      expect(res.body.title).toBe('En Progreso');
      expect(res.body.board).toBe(board._id.toString());
    });

    it('Failure path: debe responder 404 si el tablero padre no existe', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post(`/api/boards/${nonExistentId}/columns`)
        .send({ title: 'Columna Huérfana' });

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/tablero no encontrado/i);
    });

    it('Failure path: debe responder 400 si el boardId tiene formato inválido', async () => {
      const res = await request(app)
        .post('/api/boards/id-invalido/columns')
        .send({ title: 'Columna' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/no es un ObjectId válido/i);
    });

    it('Failure path: debe responder 400 si falta el título de la columna', async () => {
      const board = await Board.create({ title: 'Tablero' });
      const res = await request(app)
        .post(`/api/boards/${board._id}/columns`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/el título de la columna es obligatorio/i);
    });
  });

  describe('4. DELETE /api/boards/:boardId/columns/:columnId', () => {
    it('Happy path: debe eliminar la columna y sus tickets en cascada (204 No Content)', async () => {
      const board = await Board.create({ title: 'Tablero Borrado' });
      const column = await Column.create({ title: 'Columna a eliminar', board: board._id });
      await Ticket.create({ title: 'Ticket 1', column: column._id });
      await Ticket.create({ title: 'Ticket 2', column: column._id });

      const res = await request(app)
        .delete(`/api/boards/${board._id}/columns/${column._id}`);

      expect(res.status).toBe(204);

      // Verificar que la columna ya no existe
      const foundCol = await Column.findById(column._id);
      expect(foundCol).toBeNull();

      // Verificar que los tickets fueron eliminados en cascada
      const ticketsCount = await Ticket.countDocuments({ column: column._id });
      expect(ticketsCount).toBe(0);
    });

    it('Failure path: debe responder 404 si el tablero no existe', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const colId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .delete(`/api/boards/${nonExistentId}/columns/${colId}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/tablero no encontrado/i);
    });

    it('Failure path: debe responder 404 si la columna no existe', async () => {
      const board = await Board.create({ title: 'Tablero' });
      const nonExistentColId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .delete(`/api/boards/${board._id}/columns/${nonExistentColId}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/columna no encontrada/i);
    });

    it('Failure path: debe responder 404 si la columna pertenece a otro tablero (aislamiento)', async () => {
      const board1 = await Board.create({ title: 'Tablero 1' });
      const board2 = await Board.create({ title: 'Tablero 2' });
      const columnOfBoard2 = await Column.create({ title: 'Columna B', board: board2._id });

      const res = await request(app)
        .delete(`/api/boards/${board1._id}/columns/${columnOfBoard2._id}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/la columna no pertenece al tablero indicado/i);
    });

    it('Failure path: debe responder 400 ante ObjectId inválido', async () => {
      const board = await Board.create({ title: 'Tablero' });

      const res = await request(app)
        .delete(`/api/boards/${board._id}/columns/id-invalido`);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/no es un ObjectId válido/i);
    });
  });

  describe('5. POST /api/boards/:boardId/columns/:columnId/tickets', () => {
    it('Happy path: debe crear un ticket dentro de la columna indicada (201 Created)', async () => {
      const board = await Board.create({ title: 'Tablero' });
      const col = await Column.create({ title: 'Columna', board: board._id });

      const res = await request(app)
        .post(`/api/boards/${board._id}/columns/${col._id}/tickets`)
        .send({
          title: 'Implementar autenticación',
          description: 'Usar JWT y bcrypt'
        });

      expect(res.status).toBe(201);
      expect(res.body._id).toBeDefined();
      expect(res.body.title).toBe('Implementar autenticación');
      expect(res.body.description).toBe('Usar JWT y bcrypt');
      expect(res.body.column).toBe(col._id.toString());
    });

    it('Failure path: debe responder 404 si el tablero padre no existe', async () => {
      const nonExistentBoardId = new mongoose.Types.ObjectId().toString();
      const colId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .post(`/api/boards/${nonExistentBoardId}/columns/${colId}/tickets`)
        .send({ title: 'Ticket' });

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/tablero no encontrado/i);
    });

    it('Failure path: debe responder 404 si la columna no existe', async () => {
      const board = await Board.create({ title: 'Tablero' });
      const nonExistentColId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .post(`/api/boards/${board._id}/columns/${nonExistentColId}/tickets`)
        .send({ title: 'Ticket' });

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/columna no encontrada/i);
    });

    it('Failure path: debe responder 404 si la columna pertenece a otro tablero (aislamiento)', async () => {
      const board1 = await Board.create({ title: 'Tablero 1' });
      const board2 = await Board.create({ title: 'Tablero 2' });
      const colBoard2 = await Column.create({ title: 'Columna Board 2', board: board2._id });

      const res = await request(app)
        .post(`/api/boards/${board1._id}/columns/${colBoard2._id}/tickets`)
        .send({ title: 'Ticket invasor' });

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/la columna no pertenece al tablero indicado/i);
    });

    it('Failure path: debe responder 400 si falta el título del ticket', async () => {
      const board = await Board.create({ title: 'Tablero' });
      const col = await Column.create({ title: 'Columna', board: board._id });

      const res = await request(app)
        .post(`/api/boards/${board._id}/columns/${col._id}/tickets`)
        .send({ description: 'Solo descripción sin título' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/el título del ticket es obligatorio/i);
    });
  });

  describe('6. PATCH /api/boards/:boardId/columns/:columnId/tickets/:ticketId', () => {
    it('Happy path: debe actualizar el título y la descripción del ticket (200 OK)', async () => {
      const board = await Board.create({ title: 'Tablero' });
      const col = await Column.create({ title: 'Columna', board: board._id });
      const ticket = await Ticket.create({
        title: 'Título Original',
        description: 'Desc Original',
        column: col._id
      });

      const res = await request(app)
        .patch(`/api/boards/${board._id}/columns/${col._id}/tickets/${ticket._id}`)
        .send({
          title: 'Título Actualizado',
          description: 'Desc Actualizada'
        });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Título Actualizado');
      expect(res.body.description).toBe('Desc Actualizada');
      expect(res.body.column).toBe(col._id.toString());
    });

    it('Idempotencia: peticiones repetidas idénticas deben producir exactamente el mismo resultado', async () => {
      const board = await Board.create({ title: 'Tablero' });
      const col = await Column.create({ title: 'Columna', board: board._id });
      const ticket = await Ticket.create({
        title: 'Título Original',
        column: col._id
      });

      const patchPayload = { title: 'Título Idempotente', description: 'Desc Idempotente' };

      // Primera ejecución
      const res1 = await request(app)
        .patch(`/api/boards/${board._id}/columns/${col._id}/tickets/${ticket._id}`)
        .send(patchPayload);

      expect(res1.status).toBe(200);

      // Segunda ejecución idéntica
      const res2 = await request(app)
        .patch(`/api/boards/${board._id}/columns/${col._id}/tickets/${ticket._id}`)
        .send(patchPayload);

      expect(res2.status).toBe(200);
      expect(res2.body.title).toBe(res1.body.title);
      expect(res2.body.description).toBe(res1.body.description);

      // Comprobar que en la base de datos no hay duplicados
      const tickets = await Ticket.find({ column: col._id });
      expect(tickets).toHaveLength(1);
    });

    it('Mover ticket: debe mover el ticket a otra columna del mismo tablero (200 OK)', async () => {
      const board = await Board.create({ title: 'Tablero' });
      const colOrigen = await Column.create({ title: 'To Do', board: board._id });
      const colDestino = await Column.create({ title: 'Done', board: board._id });
      const ticket = await Ticket.create({ title: 'Moverme', column: colOrigen._id });

      const res = await request(app)
        .patch(`/api/boards/${board._id}/columns/${colOrigen._id}/tickets/${ticket._id}`)
        .send({ columnId: colDestino._id.toString() });

      expect(res.status).toBe(200);
      expect(res.body.column).toBe(colDestino._id.toString());

      // Verificar en base de datos
      const updatedTicket = await Ticket.findById(ticket._id);
      expect(updatedTicket.column.toString()).toBe(colDestino._id.toString());
    });

    it('Failure path: debe rechazar mover el ticket a una columna que pertenece a OTRO tablero', async () => {
      const board1 = await Board.create({ title: 'Tablero 1' });
      const board2 = await Board.create({ title: 'Tablero 2' });
      const colBoard1 = await Column.create({ title: 'Col Tablero 1', board: board1._id });
      const colBoard2 = await Column.create({ title: 'Col Tablero 2', board: board2._id });
      const ticket = await Ticket.create({ title: 'Ticket', column: colBoard1._id });

      const res = await request(app)
        .patch(`/api/boards/${board1._id}/columns/${colBoard1._id}/tickets/${ticket._id}`)
        .send({ columnId: colBoard2._id.toString() });

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/la columna de destino no pertenece al tablero actual/i);
    });

    it('Failure path: debe responder 400 si se intenta actualizar campos no permitidos', async () => {
      const board = await Board.create({ title: 'Tablero' });
      const col = await Column.create({ title: 'Columna', board: board._id });
      const ticket = await Ticket.create({ title: 'Ticket', column: col._id });

      const res = await request(app)
        .patch(`/api/boards/${board._id}/columns/${col._id}/tickets/${ticket._id}`)
        .send({ hackerField: 'valor' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/campos no permitidos/i);
    });

    it('Failure path: debe responder 404 si el ticket no pertenece a la columna especificada', async () => {
      const board = await Board.create({ title: 'Tablero' });
      const col1 = await Column.create({ title: 'Col 1', board: board._id });
      const col2 = await Column.create({ title: 'Col 2', board: board._id });
      const ticketInCol2 = await Ticket.create({ title: 'Ticket en Col 2', column: col2._id });

      const res = await request(app)
        .patch(`/api/boards/${board._id}/columns/${col1._id}/tickets/${ticketInCol2._id}`)
        .send({ title: 'Nuevo Título' });

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/el ticket no pertenece a la columna indicada/i);
    });
  });

  describe('7. DELETE /api/boards/:boardId (Borrado de Tablero en Cascada)', () => {
    it('Happy path: debe eliminar el tablero y todas sus columnas y tickets en cascada (204 No Content)', async () => {
      const board = await Board.create({ title: 'Tablero a borrar en cascada' });
      const col1 = await Column.create({ title: 'Columna 1', board: board._id });
      const col2 = await Column.create({ title: 'Columna 2', board: board._id });
      await Ticket.create({ title: 'Ticket A', column: col1._id });
      await Ticket.create({ title: 'Ticket B', column: col2._id });

      const res = await request(app).delete(`/api/boards/${board._id}`);
      expect(res.status).toBe(204);

      // Comprobar que el tablero ya no existe
      expect(await Board.findById(board._id)).toBeNull();
      // Comprobar que las columnas fueron eliminadas en cascada
      expect(await Column.countDocuments({ board: board._id })).toBe(0);
      // Comprobar que los tickets fueron eliminados en cascada
      expect(await Ticket.countDocuments({})).toBe(0);
    });

    it('Failure path: debe responder 404 si el tablero no existe', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app).delete(`/api/boards/${nonExistentId}`);
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/tablero no encontrado/i);
    });

    it('Failure path: debe responder 400 si el boardId tiene formato inválido', async () => {
      const res = await request(app).delete('/api/boards/formato-invalido-123');
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/no es un ObjectId válido/i);
    });
  });

  describe('8. DELETE /api/boards/:boardId/columns/:columnId/tickets/:ticketId (Borrado de Ticket)', () => {
    it('Happy path: debe eliminar un ticket y responder 204 No Content', async () => {
      const board = await Board.create({ title: 'Tablero' });
      const col = await Column.create({ title: 'Columna', board: board._id });
      const ticket = await Ticket.create({ title: 'Ticket a eliminar', column: col._id });

      const res = await request(app)
        .delete(`/api/boards/${board._id}/columns/${col._id}/tickets/${ticket._id}`);

      expect(res.status).toBe(204);
      expect(await Ticket.findById(ticket._id)).toBeNull();
    });

    it('Failure path: debe responder 404 si el ticket no existe', async () => {
      const board = await Board.create({ title: 'Tablero' });
      const col = await Column.create({ title: 'Columna', board: board._id });
      const nonExistentTicketId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .delete(`/api/boards/${board._id}/columns/${col._id}/tickets/${nonExistentTicketId}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/ticket no encontrado/i);
    });

    it('Failure path: debe responder 404 si el ticket pertenece a otra columna (aislamiento)', async () => {
      const board = await Board.create({ title: 'Tablero' });
      const col1 = await Column.create({ title: 'Col 1', board: board._id });
      const col2 = await Column.create({ title: 'Col 2', board: board._id });
      const ticketInCol2 = await Ticket.create({ title: 'Ticket en Col 2', column: col2._id });

      const res = await request(app)
        .delete(`/api/boards/${board._id}/columns/${col1._id}/tickets/${ticketInCol2._id}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/el ticket no pertenece a la columna indicada/i);
    });

    it('Failure path: debe responder 400 si el ticketId es inválido', async () => {
      const board = await Board.create({ title: 'Tablero' });
      const col = await Column.create({ title: 'Columna', board: board._id });

      const res = await request(app)
        .delete(`/api/boards/${board._id}/columns/${col._id}/tickets/id-invalido`);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/no es un ObjectId válido/i);
    });
  });

  describe('9. Casos transversales: JSON inválido y rutas desconocidas', () => {
    it('debe responder 404 con JSON cuando la ruta no existe', async () => {
      const res = await request(app).get('/api/rutainexistente');
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/ruta no encontrada/i);
    });

    it('debe responder 400 cuando se envía un JSON malformado', async () => {
      const res = await request(app)
        .post('/api/boards')
        .set('Content-Type', 'application/json')
        .send('{ "title": malformado');

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/formato de json inválido/i);
    });
  });
});

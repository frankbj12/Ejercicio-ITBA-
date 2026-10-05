import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectTestDB, closeTestDB, clearTestDB } from './setup.js';
import Board from '../src/models/Board.js';
import Column from '../src/models/Column.js';
import Ticket from '../src/models/Ticket.js';

describe('Fase 1: Modelos de Datos Mongoose y Hooks de Cascada', () => {
  beforeAll(async () => {
    await connectTestDB();
  }, 30000);

  afterAll(async () => {
    await closeTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  describe('Board Model', () => {
    it('debe crear un tablero válido con título', async () => {
      const board = await Board.create({ title: 'Tablero Principal' });
      expect(board._id).toBeDefined();
      expect(board.title).toBe('Tablero Principal');
      expect(board.createdAt).toBeDefined();
      expect(board.updatedAt).toBeDefined();
    });

    it('debe fallar la validación si falta el título', async () => {
      await expect(Board.create({})).rejects.toThrow();
    });

    it('debe eliminar espacios en blanco al inicio y final del título (trim)', async () => {
      const board = await Board.create({ title: '   Tablero Con Espacios   ' });
      expect(board.title).toBe('Tablero Con Espacios');
    });
  });

  describe('Column Model', () => {
    it('debe crear una columna válida asociada a un tablero', async () => {
      const board = await Board.create({ title: 'Tablero 1' });
      const column = await Column.create({ title: 'Por Hacer', board: board._id });

      expect(column._id).toBeDefined();
      expect(column.title).toBe('Por Hacer');
      expect(column.board.toString()).toBe(board._id.toString());
    });

    it('debe fallar la validación si falta el título de la columna', async () => {
      const board = await Board.create({ title: 'Tablero 1' });
      await expect(Column.create({ board: board._id })).rejects.toThrow();
    });

    it('debe fallar la validación si falta el tablero asociado', async () => {
      await expect(Column.create({ title: 'Sin Tablero' })).rejects.toThrow();
    });
  });

  describe('Ticket Model', () => {
    it('debe crear un ticket válido asociado a una columna', async () => {
      const board = await Board.create({ title: 'Tablero 1' });
      const column = await Column.create({ title: 'Por Hacer', board: board._id });
      const ticket = await Ticket.create({
        title: 'Crear documentación',
        description: 'Detalles del ticket',
        column: column._id
      });

      expect(ticket._id).toBeDefined();
      expect(ticket.title).toBe('Crear documentación');
      expect(ticket.description).toBe('Detalles del ticket');
      expect(ticket.column.toString()).toBe(column._id.toString());
    });

    it('debe fallar la validación si falta el título del ticket', async () => {
      const board = await Board.create({ title: 'Tablero 1' });
      const column = await Column.create({ title: 'Por Hacer', board: board._id });
      await expect(Ticket.create({ column: column._id })).rejects.toThrow();
    });

    it('debe fallar la validación si falta la columna asociada', async () => {
      await expect(Ticket.create({ title: 'Ticket Huérfano' })).rejects.toThrow();
    });
  });

  describe('Relaciones y Población Virtual', () => {
    it('debe poblar las columnas de un tablero y los tickets de cada columna', async () => {
      const board = await Board.create({ title: 'Tablero Completo' });
      const col1 = await Column.create({ title: 'Columna 1', board: board._id });
      const col2 = await Column.create({ title: 'Columna 2', board: board._id });

      await Ticket.create({ title: 'Ticket A', column: col1._id });
      await Ticket.create({ title: 'Ticket B', column: col1._id });
      await Ticket.create({ title: 'Ticket C', column: col2._id });

      const populatedBoard = await Board.findById(board._id).populate({
        path: 'columns',
        populate: { path: 'tickets' }
      });

      expect(populatedBoard.columns).toHaveLength(2);
      const populatedCol1 = populatedBoard.columns.find(c => c._id.toString() === col1._id.toString());
      expect(populatedCol1.tickets).toHaveLength(2);
    });
  });

  describe('Borrado en Cascada (Hooks de Mongoose)', () => {
    it('debe eliminar en cascada todos los tickets de una columna al eliminar la columna con deleteOne()', async () => {
      const board = await Board.create({ title: 'Tablero Test' });
      const column = await Column.create({ title: 'Columna a borrar', board: board._id });

      await Ticket.create({ title: 'Ticket 1', column: column._id });
      await Ticket.create({ title: 'Ticket 2', column: column._id });

      expect(await Ticket.countDocuments({ column: column._id })).toBe(2);

      // Ejecutar deleteOne sobre el documento
      await column.deleteOne();

      // Verificar que los tickets fueron eliminados
      expect(await Ticket.countDocuments({ column: column._id })).toBe(0);
    });

    it('debe eliminar en cascada columnas y tickets al eliminar un tablero con deleteOne()', async () => {
      const board = await Board.create({ title: 'Tablero a borrar' });
      const col1 = await Column.create({ title: 'Col 1', board: board._id });
      const col2 = await Column.create({ title: 'Col 2', board: board._id });

      await Ticket.create({ title: 'Ticket 1', column: col1._id });
      await Ticket.create({ title: 'Ticket 2', column: col2._id });

      expect(await Column.countDocuments({ board: board._id })).toBe(2);
      expect(await Ticket.countDocuments({})).toBe(2);

      // Ejecutar deleteOne sobre el tablero
      await board.deleteOne();

      // Verificar que las columnas y los tickets fueron eliminados
      expect(await Column.countDocuments({ board: board._id })).toBe(0);
      expect(await Ticket.countDocuments({})).toBe(0);
    });
  });
});

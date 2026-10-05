import express from 'express';
import boardRoutes from './routes/boardRoutes.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();

// Middleware para procesar cuerpos JSON
app.use(express.json());

// Montaje de rutas de la API
app.use('/api/boards', boardRoutes);

// Manejo de rutas inexistentes (404)
app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

// Middleware global de manejo de errores
app.use(errorHandler);

export default app;

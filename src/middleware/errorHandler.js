/**
 * Middleware global de manejo de errores.
 * Centraliza la transformación de errores y asegura respuestas JSON consistentes.
 */
export function errorHandler(err, req, res, next) {
  // Error de sintaxis en JSON (body-parser / express.json)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Formato de JSON inválido en el cuerpo de la petición'
    });
  }

  // Error de validación de Mongoose
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({
      error: messages.join('. ')
    });
  }

  // Error de casteo de Mongoose (CastError / ObjectId malformado)
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: `Formato inválido para el campo '${err.path}' con valor '${err.value}'`
    });
  }

  // Errores con código de estado HTTP explícito
  const statusCode = err.statusCode || err.status || 500;
  const message = statusCode === 500 ? 'Error interno del servidor' : (err.message || 'Error en la solicitud');

  res.status(statusCode).json({
    error: message
  });
}

export default errorHandler;

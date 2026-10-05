import mongoose from 'mongoose';

/**
 * Middleware para validar que los identificadores en req.params sean ObjectIds válidos de MongoDB.
 * Si no se especifican nombres de parámetros, valida automáticamente todos los parámetros que terminen en 'Id'.
 */
export function validateObjectId(...paramNames) {
  return (req, res, next) => {
    const paramsToCheck = paramNames.length > 0
      ? paramNames
      : Object.keys(req.params).filter(param => param.toLowerCase().endsWith('id'));

    for (const param of paramsToCheck) {
      const id = req.params[param];
      if (id && !mongoose.isValidObjectId(id)) {
        return res.status(400).json({
          error: `El identificador '${id}' para '${param}' no es un ObjectId válido de MongoDB`
        });
      }
    }

    next();
  };
}

export default validateObjectId;

import mongoose from 'mongoose';

/**
 * Conecta a MongoDB utilizando la URI configurada en variables de entorno.
 */
export async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/kanban';
  try {
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB conectado exitosamente: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error al conectar a MongoDB: ${error.message}`);
    process.exit(1);
  }
}

export default connectDB;

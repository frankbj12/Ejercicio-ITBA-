import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'El título del ticket es obligatorio'],
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    column: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Column',
      required: [true, 'La columna asociada es obligatoria']
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

const Ticket = mongoose.model('Ticket', ticketSchema);

export default Ticket;

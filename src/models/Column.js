import mongoose from 'mongoose';

const columnSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'El título de la columna es obligatorio'],
      trim: true
    },
    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Board',
      required: [true, 'El tablero asociado es obligatorio']
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual relationship to tickets
columnSchema.virtual('tickets', {
  ref: 'Ticket',
  localField: '_id',
  foreignField: 'column'
});

// Cascade delete: when a column is deleted, delete all its tickets
columnSchema.pre('deleteOne', { document: true, query: false }, async function () {
  const Ticket = mongoose.model('Ticket');
  await Ticket.deleteMany({ column: this._id });
});

// Also support query-based findOneAndDelete for cascade
columnSchema.pre('findOneAndDelete', async function () {
  const doc = await this.model.findOne(this.getQuery());
  if (doc) {
    const Ticket = mongoose.model('Ticket');
    await Ticket.deleteMany({ column: doc._id });
  }
});

const Column = mongoose.model('Column', columnSchema);

export default Column;

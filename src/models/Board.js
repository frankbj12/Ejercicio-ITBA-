import mongoose from 'mongoose';

const boardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'El título del tablero es obligatorio'],
      trim: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual relationship to columns
boardSchema.virtual('columns', {
  ref: 'Column',
  localField: '_id',
  foreignField: 'board'
});

// Cascade delete: when a board is deleted, delete its columns (which in turn deletes their tickets)
boardSchema.pre('deleteOne', { document: true, query: false }, async function () {
  const Column = mongoose.model('Column');
  const columns = await Column.find({ board: this._id });
  for (const column of columns) {
    await column.deleteOne();
  }
});

// Also support query-based deleteOne/findOneAndDelete for cascade
boardSchema.pre('findOneAndDelete', async function () {
  const doc = await this.model.findOne(this.getQuery());
  if (doc) {
    const Column = mongoose.model('Column');
    const columns = await Column.find({ board: doc._id });
    for (const column of columns) {
      await column.deleteOne();
    }
  }
});

const Board = mongoose.model('Board', boardSchema);

export default Board;

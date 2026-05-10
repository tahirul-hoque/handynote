import mongoose, { Schema, Document } from 'mongoose';

export interface INote extends Document {
  title: string;
  canvasJson: string;
  createdAt: Date;
  updatedAt: Date;
  userId?: string; // For future authentication
}

const NoteSchema: Schema = new Schema(
  {
    title: { type: String, required: true, default: 'Untitled Note' },
    canvasJson: { type: String, default: '' },
    userId: { type: String, required: false },
  },
  { timestamps: true }
);

export default mongoose.models.Note || mongoose.model<INote>('Note', NoteSchema);

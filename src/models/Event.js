import mongoose from 'mongoose';
const eventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  date: { type: Date, required: true },
  location: { type: String, required: true, trim: true },
  capacity: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
  price: { type: Number, min: 0, default: 0 },
  status: { type: String, enum: ['draft', 'published', 'cancelled', 'finished'], default: 'draft' },
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reservationVersion: { type: Number, default: 0, select: false },
}, { timestamps: true });
export default mongoose.model('Event', eventSchema);

import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  status: { type: String, enum: ['confirmed', 'pending', 'cancelled'], default: 'confirmed' },
  quantity: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
  reservationCode: { type: String, required: true, unique: true },
  cancelledAt: { type: Date, default: null },
}, { timestamps: true });
schema.index({ event: 1, user: 1 }, {
  unique: true, partialFilterExpression: { status: { $in: ['pending', 'confirmed'] } },
});
export default mongoose.model('Ticket', schema);

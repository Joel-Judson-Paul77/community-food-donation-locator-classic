import mongoose from 'mongoose';

export const CLAIM_STATUSES = ['pending', 'approved', 'rejected', 'cancelled', 'collected'];

// A recipient's request for (part of) a donation.
const claimSchema = new mongoose.Schema(
  {
    donation: { type: mongoose.Schema.Types.ObjectId, ref: 'Donation', required: true, index: true },
    donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
      validate: { validator: Number.isInteger, message: 'Quantity must be a whole number' },
    },
    message: { type: String, trim: true, maxlength: 500 },
    status: { type: String, enum: CLAIM_STATUSES, default: 'pending', index: true },
    donorNote: { type: String, trim: true, maxlength: 300 },
    respondedAt: Date,
    collectedAt: Date,
  },
  { timestamps: true }
);

claimSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('Claim', claimSchema);

import mongoose from 'mongoose';

export const CATEGORIES = [
  'cooked-meals',
  'bakery',
  'fruits-vegetables',
  'dairy',
  'grains-staples',
  'packaged',
  'beverages',
  'other',
];
export const DIETARY = ['vegetarian', 'vegan', 'non-vegetarian', 'gluten-free', 'halal', 'jain'];
export const DONATION_STATUSES = ['available', 'reserved', 'completed', 'expired', 'cancelled'];

const donationSchema = new mongoose.Schema(
  {
    donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 1000 },
    category: { type: String, enum: { values: CATEGORIES, message: 'Invalid category' }, required: true },
    dietary: [{ type: String, enum: { values: DIETARY, message: 'Invalid dietary tag' } }],
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      validate: { validator: Number.isInteger, message: 'Quantity must be a whole number' },
    },
    // How much is still open for requests (quantity minus approved requests)
    quantityAvailable: { type: Number, min: 0 },
    unit: { type: String, trim: true, default: 'servings', maxlength: 20 },
    // Food must be picked up before this time
    expiresAt: { type: Date, required: [true, 'Pickup-by time is required'] },
    address: { type: String, required: [true, 'Pickup address is required'], trim: true, maxlength: 250 },
    pickupInstructions: { type: String, trim: true, maxlength: 300 },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      // GeoJSON order: [longitude, latitude]
      coordinates: {
        type: [Number],
        required: true,
        validate: { validator: (v) => v.length === 2, message: 'Location must be [lng, lat]' },
      },
    },
    image: { type: String },
    status: { type: String, enum: DONATION_STATUSES, default: 'available', index: true },
  },
  { timestamps: true }
);

donationSchema.index({ location: '2dsphere' });
donationSchema.index({ status: 1, expiresAt: 1 });

donationSchema.pre('validate', function () {
  if (this.isNew && this.quantityAvailable == null) this.quantityAvailable = this.quantity;
});

/** Marks open listings whose pickup-by time has passed as expired. */
donationSchema.statics.expireStale = function () {
  return this.updateMany(
    { status: 'available', expiresAt: { $lte: new Date() } },
    { $set: { status: 'expired' } }
  );
};

donationSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('Donation', donationSchema);

import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema(
  {
    userId: { type: String, default: 'default_user' },
    company: { type: String, required: true },
    role: { type: String, required: true },
    location: { type: String, default: 'Remote' },
    status: {
      type: String,
      enum: ['applied', 'screening', 'interviewing', 'offer', 'rejected'],
      default: 'applied',
    },
    appliedDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
    deadlineDate: { type: String, default: '' },
    deadline: { type: String, default: '' },
    interviewDate: { type: String, default: '' },
    interviewDateTime: { type: String, default: '' },
    matchScore: { type: Number, default: 85 },
    notes: { type: String, default: '' },
    jobUrl: { type: String, default: '' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

applicationSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('Application', applicationSchema);

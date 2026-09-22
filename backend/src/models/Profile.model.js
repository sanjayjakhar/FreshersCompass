import mongoose from 'mongoose';

const profileSchema = new mongoose.Schema(
  {
    userId: { type: String, default: 'default_user', unique: true },
    github_username: { type: String, default: 'sanjayjakhar' },
    candidate_name: { type: String, default: 'Sanjay Jakhar' },
    bio: { type: String, default: 'Early Career Fullstack Engineer' },
    headline: { type: String, default: 'Fullstack Engineer & Systems Builder' },
    target_role: { type: String, default: 'Junior SDE / Fullstack' },
    about: { type: String, default: '' },
    readiness_score: { type: Number, default: 82 },
    competency_scores: {
      resume: { type: Number, default: 84 },
      code: { type: Number, default: 80 },
      interview: { type: Number, default: 78 },
      roadmap: { type: Number, default: 70 },
      velocity: { type: Number, default: 85 },
    },
    linkedin_data: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export default mongoose.model('Profile', profileSchema);


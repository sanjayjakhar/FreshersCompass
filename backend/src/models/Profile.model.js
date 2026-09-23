import mongoose from 'mongoose';

const profileSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true },
    github_username: { type: String, default: '' },
    candidate_name: { type: String, default: '' },
    bio: { type: String, default: '' },
    headline: { type: String, default: '' },
    target_role: { type: String, default: '' },
    about: { type: String, default: '' },
    readiness_score: { type: Number, default: 0 },
    competency_scores: {
      resume: { type: Number, default: 0 },
      code: { type: Number, default: 0 },
      interview: { type: Number, default: 0 },
      roadmap: { type: Number, default: 0 },
      velocity: { type: Number, default: 0 },
    },
    linkedin_data: { type: mongoose.Schema.Types.Mixed, default: null },
    featured_project: { type: String, default: '' },
    project_tech: { type: String, default: '' },
    project_description: { type: String, default: '' },
    project_url: { type: String, default: '' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export default mongoose.model('Profile', profileSchema);


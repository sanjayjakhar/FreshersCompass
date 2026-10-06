import mongoose from 'mongoose';

// One readiness radar reading captured at a point in time. `day` is the UTC day
// key so the trendline keeps a single point per day (#58).
const readinessSnapshotSchema = new mongoose.Schema(
  {
    day: { type: String, required: true },
    capturedAt: { type: Date, default: Date.now },
    overall: { type: Number, default: 0 },
    axes: {
      resume: { type: Number, default: 0 },
      code: { type: Number, default: 0 },
      interview: { type: Number, default: 0 },
      roadmap: { type: Number, default: 0 },
      velocity: { type: Number, default: 0 },
    },
  },
  { _id: false }
);

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
    readiness_snapshots: { type: [readinessSnapshotSchema], default: [] },
    linkedin_data: { type: mongoose.Schema.Types.Mixed, default: null },
    featured_project: { type: String, default: '' },
    project_tech: { type: String, default: '' },
    project_description: { type: String, default: '' },
    project_url: { type: String, default: '' },
    vanity_slug: { type: String, trim: true, lowercase: true, sparse: true, unique: true },
    privacy: {
      show_email: { type: Boolean, default: true },
      show_phone: { type: Boolean, default: false },
      show_gpa: { type: Boolean, default: true },
      show_compensation: { type: Boolean, default: false },
    },
    last_commit_hash: { type: String, default: '' },
    last_commit_message: { type: String, default: '' },
    last_synced_repo: { type: String, default: '' },
    last_synced_at: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export default mongoose.model('Profile', profileSchema);


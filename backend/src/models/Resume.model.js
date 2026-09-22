import mongoose from 'mongoose';

const resumeSchema = new mongoose.Schema(
  {
    userId: { type: String, default: 'default_user' },
    name: { type: String, default: 'Developer Candidate' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    github_username: { type: String, default: '' },
    linkedin_url: { type: String, default: '' },
    portfolio_url: { type: String, default: '' },
    ats_score: { type: Number, default: 75 },
    skills: { type: [String], default: [] },
    experience: [
      {
        role: String,
        title: String,
        company: String,
        duration: String,
        description: String,
      },
    ],
    education: [
      {
        degree: String,
        field: String,
        institution: String,
        school: String,
        year: String,
      },
    ],
    improvement_suggestions: { type: [String], default: [] },
    fileName: { type: String, default: '' },
    fileSize: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Optimize query for latest resume
resumeSchema.index({ userId: 1, updatedAt: -1 });

export default mongoose.model('Resume', resumeSchema);

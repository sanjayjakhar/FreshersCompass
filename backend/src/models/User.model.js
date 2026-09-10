import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String }, // For local auth if needed
    githubId: { type: String, unique: true, sparse: true },
    linkedinId: { type: String, unique: true, sparse: true },
    profilePic: { type: String },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);

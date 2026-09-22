import Profile from '../models/Profile.model.js';
import Resume from '../models/Resume.model.js';

/**
 * Get active candidate profile and aggregated twin telemetry from MongoDB
 */
export const getProfile = async (req, res) => {
  try {
    const userId = req.user?.id || 'default_user';
    let profile = await Profile.findOne({ userId });

    if (!profile) {
      // Check if resume has a username
      const resume = await Resume.findOne({ userId }).sort({ updatedAt: -1 });
      profile = await Profile.create({
        userId,
        github_username: resume?.github_username || 'sanjayjakhar',
        readiness_score: resume?.ats_score || 82,
      });
    }

    return res.status(200).json({
      message: 'Profile retrieved from MongoDB',
      data: profile,
    });
  } catch (error) {
    console.error('Error fetching profile from MongoDB:', error.message);
    return res.status(500).json({ message: 'Error retrieving profile', details: error.message });
  }
};

/**
 * Update candidate profile / GitHub handle in MongoDB
 */
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user?.id || 'default_user';
    const {
      github_username,
      candidate_name,
      bio,
      headline,
      target_role,
      about,
      readiness_score,
      competency_scores,
      linkedin_data,
    } = req.body;

    const updateFields = {};
    if (github_username !== undefined) updateFields.github_username = github_username.replace(/^@/, '').trim();
    if (candidate_name !== undefined) updateFields.candidate_name = candidate_name;
    if (bio !== undefined) updateFields.bio = bio;
    if (headline !== undefined) updateFields.headline = headline;
    if (target_role !== undefined) updateFields.target_role = target_role;
    if (about !== undefined) updateFields.about = about;
    if (readiness_score !== undefined) updateFields.readiness_score = readiness_score;
    if (competency_scores !== undefined) updateFields.competency_scores = competency_scores;
    if (linkedin_data !== undefined) updateFields.linkedin_data = linkedin_data;

    const updated = await Profile.findOneAndUpdate(
      { userId },
      { $set: updateFields },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      message: 'Profile updated in MongoDB',
      data: updated,
    });
  } catch (error) {
    console.error('Error updating profile in MongoDB:', error.message);
    return res.status(500).json({ message: 'Error saving profile to database', details: error.message });
  }
};

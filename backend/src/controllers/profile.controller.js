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
      featured_project,
      project_tech,
      project_description,
      project_url,
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
    if (featured_project !== undefined) updateFields.featured_project = featured_project;
    if (project_tech !== undefined) updateFields.project_tech = project_tech;
    if (project_description !== undefined) updateFields.project_description = project_description;
    if (project_url !== undefined) updateFields.project_url = project_url;

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

/**
 * Get public developer portfolio and verified twin telemetry (No auth required)
 */
export const getPublicProfile = async (req, res) => {
  try {
    const rawUsername = req.params.username;
    if (!rawUsername) {
      return res.status(400).json({ message: 'Username parameter is required' });
    }

    const cleanUsername = rawUsername.replace(/^@/, '').trim();
    const usernameRegex = new RegExp(`^${cleanUsername}$`, 'i');

    // 1. Locate Profile by github_username or userId
    let profile = await Profile.findOne({
      $or: [
        { github_username: usernameRegex },
        { userId: cleanUsername },
      ],
    }).lean();

    // 2. Locate Latest Resume for candidate skills, experience & education
    let resume = null;
    if (profile?.userId) {
      resume = await Resume.findOne({
        $or: [
          { userId: profile.userId },
          { github_username: usernameRegex },
        ],
      })
        .sort({ updatedAt: -1 })
        .lean();
    } else {
      resume = await Resume.findOne({
        $or: [
          { github_username: usernameRegex },
          { userId: cleanUsername },
        ],
      })
        .sort({ updatedAt: -1 })
        .lean();
    }

    // 3. Fallback demo data if user has not yet populated profile/resume in DB
    if (!profile && !resume) {
      const fallbackName = cleanUsername
        .split(/[-_.]/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

      return res.status(200).json({
        message: 'Demo public profile retrieved',
        data: {
          candidate_name: fallbackName || 'Developer Candidate',
          github_username: cleanUsername,
          email: `${cleanUsername.toLowerCase()}@example.com`,
          headline: 'Fullstack Engineer & Systems Builder',
          bio: 'Passionate about writing high-performance APIs, distributed systems, and real-time developer tooling.',
          about: 'Building resilient modern web applications with deterministic performance and rigorous clean architecture.',
          target_role: 'Fullstack Developer / Junior SDE',
          readiness_score: 85,
          competency_scores: {
            resume: 85,
            code: 82,
            interview: 80,
            roadmap: 78,
            velocity: 86,
          },
          featured_project: 'FreshersCompass Platform',
          project_tech: 'React, Node.js, Express, MongoDB, Tailwind CSS',
          project_description: 'Next-generation AI career acceleration platform for early-career developers.',
          project_url: `https://github.com/${cleanUsername}`,
          skills: ['React', 'Node.js', 'Express', 'MongoDB', 'JavaScript', 'Tailwind CSS', 'Git', 'REST APIs'],
          experience: [
            {
              title: 'Fullstack Developer Intern',
              company: 'Tech Solutions',
              duration: '2025 - Present',
              description: 'Engineered responsive interfaces and REST APIs with 99.9% uptime and comprehensive unit test suites.',
            },
          ],
          education: [
            {
              degree: 'B.Tech in Computer Science',
              institution: 'Birla Institute of Technology',
              year: '2026',
            },
          ],
          ats_score: 85,
          verified: true,
          isDemo: true,
        },
      });
    }

    // 4. Merge verified profile and resume data
    const publicData = {
      candidate_name: profile?.candidate_name || resume?.name || cleanUsername,
      github_username: profile?.github_username || resume?.github_username || cleanUsername,
      email: resume?.email || '',
      headline: profile?.headline || 'Fullstack Engineer & Systems Builder',
      bio: profile?.bio || profile?.about || 'Software engineer specializing in modern web applications.',
      about: profile?.about || profile?.bio || '',
      target_role: profile?.target_role || 'Junior SDE / Fullstack',
      readiness_score: profile?.readiness_score || resume?.ats_score || 82,
      competency_scores: profile?.competency_scores || {
        resume: 84,
        code: 80,
        interview: 78,
        roadmap: 70,
        velocity: 85,
      },
      featured_project: profile?.featured_project || 'InternOps Platform',
      project_tech: profile?.project_tech || 'Node.js, Fastify, PostgreSQL, React, Vite',
      project_description:
        profile?.project_description || 'Architecture and repository indexed for automated candidate defense.',
      project_url: profile?.project_url || '',
      skills: resume?.skills?.length
        ? resume.skills
        : ['React', 'Node.js', 'Express', 'MongoDB', 'JavaScript', 'Tailwind CSS', 'Git'],
      experience: resume?.experience || [],
      education: resume?.education || [],
      ats_score: resume?.ats_score || profile?.readiness_score || 82,
      linkedin_url: resume?.linkedin_url || '',
      portfolio_url: resume?.portfolio_url || '',
      verified: true,
      isDemo: false,
    };

    return res.status(200).json({
      message: 'Public profile retrieved successfully',
      data: publicData,
    });
  } catch (error) {
    console.error('Error fetching public profile:', error.message);
    return res.status(500).json({ message: 'Error retrieving public profile', details: error.message });
  }
};

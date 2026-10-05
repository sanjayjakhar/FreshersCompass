import Profile from '../models/Profile.model.js';
import Resume from '../models/Resume.model.js';
import { getEffectiveUserId } from '../middleware/auth.middleware.js';

/**
 * Get active candidate profile and aggregated twin telemetry from MongoDB
 */
export const getProfile = async (req, res) => {
  try {
    const userId = getEffectiveUserId(req);
    let profile = await Profile.findOne({ userId });

    if (!profile) {
      // Check if resume has a username or name
      const resume = await Resume.findOne({ userId }).sort({ updatedAt: -1 });
      profile = await Profile.create({
        userId,
        github_username: resume?.github_username ? resume.github_username.replace(/^@/, '').trim() : '',
        candidate_name: resume?.name || '',
        readiness_score: resume?.ats_score || 0,
        competency_scores: {
          resume: resume?.ats_score || 0,
          code: 0,
          interview: 0,
          roadmap: 0,
          velocity: 0,
        },
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
    const userId = getEffectiveUserId(req);

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
      vanity_slug,
      privacy,
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

    if (vanity_slug !== undefined) {
      const cleanSlug = vanity_slug.trim().toLowerCase().replace(/^@/, '');
      if (cleanSlug) {
        if (!/^[a-z0-9-]+$/.test(cleanSlug)) {
          return res.status(400).json({
            message: 'Vanity slug can only contain lowercase alphanumeric characters and hyphens',
          });
        }
        const existing = await Profile.findOne({ vanity_slug: cleanSlug, userId: { $ne: userId } });
        if (existing) {
          return res.status(400).json({
            message: 'This vanity URL slug is already taken. Please choose another.',
          });
        }
        updateFields.vanity_slug = cleanSlug;
      } else {
        updateFields.vanity_slug = null;
      }
    }

    if (privacy !== undefined && typeof privacy === 'object') {
      updateFields.privacy = {
        show_email: privacy.show_email !== undefined ? Boolean(privacy.show_email) : true,
        show_phone: privacy.show_phone !== undefined ? Boolean(privacy.show_phone) : false,
        show_gpa: privacy.show_gpa !== undefined ? Boolean(privacy.show_gpa) : true,
        show_compensation: privacy.show_compensation !== undefined ? Boolean(privacy.show_compensation) : false,
      };
    }

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
    const escapedUsername = cleanUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const usernameRegex = new RegExp(`^${escapedUsername}$`, 'i');

    // 1. Locate Profile by vanity_slug, github_username, or userId
    let profile = await Profile.findOne({
      $or: [
        { vanity_slug: cleanUsername.toLowerCase() },
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
          vanity_slug: null,
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
          privacy: { show_email: true, show_phone: false, show_gpa: true, show_compensation: false },
        },
      });
    }

    // 4. Merge verified profile and resume data with privacy rules applied
    const privacy = profile?.privacy || { show_email: true, show_phone: false, show_gpa: true, show_compensation: false };
    const publicData = {
      candidate_name: profile?.candidate_name || resume?.name || cleanUsername,
      github_username: profile?.github_username || resume?.github_username || cleanUsername,
      vanity_slug: profile?.vanity_slug || null,
      email: privacy.show_email ? (resume?.email || '') : '',
      phone: privacy.show_phone ? (resume?.phone || '') : '',
      privacy,
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
      education: privacy.show_gpa ? (resume?.education || []) : (resume?.education || []).map(e => ({ ...e, gpa: undefined })),
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

/**
 * Embeddable SVG Verification Badge for GitHub README and LinkedIn
 */
export const getVerificationBadge = async (req, res) => {
  const { username } = req.params;
  const cleanUsername = (username || 'Developer').replace(/^@/, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="230" height="28" viewBox="0 0 230 28" fill="none">
    <rect width="230" height="28" rx="6" fill="#0F172A"/>
    <rect width="125" height="28" rx="6" fill="#1E293B"/>
    <text x="12" y="18" fill="#94A3B8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600">FreshersCompass</text>
    <text x="135" y="18" fill="#10B981" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700">✓ Verified Twin</text>
  </svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.status(200).send(svg);
};

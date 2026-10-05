import axios from 'axios';
import FormData from 'form-data';
import Resume from '../models/Resume.model.js';
import Profile from '../models/Profile.model.js';
import { getEffectiveUserId } from '../middleware/auth.middleware.js';

/**
 * Upload resume, parse via AI microservice, and persist directly to MongoDB
 */
export const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

    let parsedData = null;
    try {
      const response = await axios.post(`${aiServiceUrl}/resume/parse`, formData, {
        headers: {
          ...formData.getHeaders(),
          'x-internal-key': process.env.AI_SERVICE_INTERNAL_KEY || 'ai_internal_secret_fc_98u23r09ju023jf',
        },
        timeout: 90000,
      });
      parsedData = response.data;
    } catch (aiErr) {
      console.error('AI parser error:', aiErr.response?.data || aiErr.message);
      const detail = aiErr.response?.data?.detail || aiErr.message;
      return res.status(502).json({
        message: 'Failed to parse resume with AI service. Please try again.',
        details: detail,
      });
    }

    // Persist parsed data to isolated user/session record in MongoDB
    const userId = getEffectiveUserId(req);

    const versionCount = await Resume.countDocuments({ userId });
    const versionNumber = versionCount + 1;
    const versionLabel =
      (req.body?.versionLabel || req.body?.label || req.query?.versionLabel || '').trim() ||
      `Version ${versionNumber} - ${req.file.originalname.replace(/\.[^/.]+$/, '')}`;

    const savedResume = await Resume.create({
      userId,
      name: parsedData.name || 'Candidate',
      email: parsedData.email || '',
      phone: parsedData.phone || '',
      github_username: (parsedData.github_username || '').replace(/^@/, '').trim(),
      linkedin_url: parsedData.linkedin_url || '',
      portfolio_url: parsedData.portfolio_url || '',
      ats_score: parsedData.ats_score || 75,
      skills: parsedData.skills || [],
      experience: parsedData.experience || [],
      education: parsedData.education || [],
      improvement_suggestions: parsedData.improvement_suggestions || [],
      fileName: req.file.originalname,
      fileSize: req.file.size,
      versionLabel,
      versionNumber,
    });

    // Sync GitHub profile in MongoDB if detected
    if (savedResume.github_username) {
      await Profile.findOneAndUpdate(
        { userId },
        { github_username: savedResume.github_username },
        { upsert: true }
      ).catch(() => {});
    }

    return res.status(200).json({
      message: 'Resume parsed and saved to MongoDB successfully',
      data: savedResume,
    });
  } catch (error) {
    console.error('Resume processing error:', error.message);
    return res.status(500).json({
      message: 'Error processing and saving resume',
      details: error.message,
    });
  }
};

/**
 * Retrieve latest or specific parsed resume from MongoDB
 */
export const getLatestResume = async (req, res) => {
  try {
    const userId = getEffectiveUserId(req);
    const { versionId } = req.query;

    let resume = null;
    if (versionId) {
      resume = await Resume.findOne({ _id: versionId, userId });
    }

    if (!resume) {
      resume = await Resume.findOne({ userId }).sort({ createdAt: -1 });
    }

    // Clean Zero-Slate: If user has not uploaded a resume yet, return null
    return res.status(200).json({
      message: resume ? 'Resume fetched from MongoDB' : 'No resume uploaded yet',
      data: resume || null,
    });
  } catch (error) {
    console.error('Error fetching resume from MongoDB:', error.message);
    return res.status(500).json({
      message: 'Error fetching resume from database',
      details: error.message,
    });
  }
};

/**
 * Retrieve all resume versions for the user
 */
export const getAllResumeVersions = async (req, res) => {
  try {
    const userId = getEffectiveUserId(req);
    const versions = await Resume.find({ userId })
      .sort({ createdAt: 1 }) // Chronological order for score trendline
      .select('_id userId versionLabel versionNumber ats_score skills fileName createdAt updatedAt');

    return res.status(200).json({
      message: 'Resume versions fetched from MongoDB',
      data: versions,
    });
  } catch (error) {
    console.error('Error fetching resume versions:', error.message);
    return res.status(500).json({
      message: 'Error fetching resume versions',
      details: error.message,
    });
  }
};

/**
 * Retrieve a single resume version by ID
 */
export const getResumeById = async (req, res) => {
  try {
    const userId = getEffectiveUserId(req);
    const resume = await Resume.findOne({ _id: req.params.id, userId });
    if (!resume) {
      return res.status(404).json({ message: 'Resume version not found' });
    }
    return res.status(200).json({
      message: 'Resume version fetched',
      data: resume,
    });
  } catch (error) {
    console.error('Error fetching resume by id:', error.message);
    return res.status(500).json({
      message: 'Error fetching resume version',
      details: error.message,
    });
  }
};

/**
 * Seed or reset demo candidate resume in MongoDB with realistic version history
 */
export const saveDemoResume = async (req, res) => {
  try {
    const userId = getEffectiveUserId(req);
    // Clear old resumes for demo reset
    await Resume.deleteMany({ userId });

    // Seed Version 1: Initial draft
    const v1 = await Resume.create({
      userId,
      versionLabel: 'V1 - Initial Campus Placement Draft',
      versionNumber: 1,
      name: 'Sanjay Jakhar',
      email: 'sanjay.jakhar@example.com',
      ats_score: 68,
      github_username: 'sanjayjakhar',
      skills: ['JavaScript', 'React', 'HTML', 'CSS', 'Node.js', 'Git'],
      experience: [
        {
          role: 'Junior Frontend Intern',
          company: 'Campus Incubator',
          duration: 'Jan 2024 - Apr 2024',
          description: 'Assisted in building web interfaces using React and CSS.',
        },
      ],
      education: [
        {
          degree: 'B.Tech in Computer Science',
          institution: 'Technical University',
          year: '2021 - 2025',
        },
      ],
      improvement_suggestions: [
        'Missing quantifiable outcomes or metrics in experience description.',
        'Add backend engineering skills like Fastify, PostgreSQL, and Docker.',
        'Include links to GitHub repositories demonstrating real-world applications.',
      ],
      fileName: 'sanjay_jakhar_v1.pdf',
      fileSize: 524288,
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
    });

    // Seed Version 2: Optimized targeted resume
    const v2 = await Resume.create({
      userId,
      versionLabel: 'V2 - Fullstack & Fintech Targeted',
      versionNumber: 2,
      name: 'Sanjay Jakhar',
      email: 'sanjay.jakhar@example.com',
      ats_score: 88,
      github_username: 'sanjayjakhar',
      skills: ['React', 'Node.js', 'Fastify', 'PostgreSQL', 'Docker', 'Redis', 'REST APIs', 'Git', 'JavaScript', 'Tailwind CSS'],
      experience: [
        {
          role: 'Fullstack Developer Intern',
          company: 'InternOps Platform',
          duration: 'May 2024 - Present',
          description: 'Engineered attendance tracking, task assignments, and rating systems using Fastify and PostgreSQL. Decreased response times by 35%.',
        },
      ],
      education: [
        {
          degree: 'B.Tech in Computer Science',
          institution: 'Technical University',
          year: '2021 - 2025',
        },
      ],
      improvement_suggestions: [
        'Add unit and integration testing coverage metrics (e.g. 85% test coverage via Vitest/Jest).',
        'Add link to system architecture design document in GitHub repository README.',
      ],
      fileName: 'sanjay_jakhar_fullstack_v2.pdf',
      fileSize: 1048576,
      createdAt: new Date(),
    });

    await Profile.findOneAndUpdate({ userId }, { github_username: 'sanjayjakhar' }, { upsert: true }).catch(() => {});

    return res.status(200).json({
      message: 'Demo resume versions seeded to MongoDB successfully',
      data: v2,
    });
  } catch (error) {
    console.error('Error saving demo resume to MongoDB:', error.message);
    return res.status(500).json({ message: 'Error saving demo data', details: error.message });
  }
};

/**
 * Delete a specific resume version by ID
 */
export const deleteResumeVersion = async (req, res) => {
  try {
    const userId = getEffectiveUserId(req);
    await Resume.deleteOne({ _id: req.params.id, userId });
    return res.status(200).json({ message: 'Resume version deleted from database' });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting resume version', details: error.message });
  }
};

/**
 * Delete all resumes for user
 */
export const deleteResume = async (req, res) => {
  try {
    const userId = getEffectiveUserId(req);
    await Resume.deleteMany({ userId });
    return res.status(200).json({ message: 'All resumes cleared from database' });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting resumes', details: error.message });
  }
};


import axios from 'axios';
import FormData from 'form-data';
import Resume from '../models/Resume.model.js';
import Profile from '../models/Profile.model.js';

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
        timeout: 45000,
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

    // Persist parsed data to MongoDB
    const userId = req.user?.id || 'default_user';
    const savedResume = await Resume.findOneAndUpdate(
      { userId },
      {
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
      },
      { upsert: true, new: true }
    );

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
 * Retrieve latest parsed resume from MongoDB
 */
export const getLatestResume = async (req, res) => {
  try {
    const userId = req.user?.id || 'default_user';
    const resume = await Resume.findOne({ userId }).sort({ updatedAt: -1 });

    return res.status(200).json({
      message: 'Resume fetched from MongoDB',
      data: resume,
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
 * Seed or reset demo candidate resume in MongoDB
 */
export const saveDemoResume = async (req, res) => {
  try {
    const userId = req.user?.id || 'default_user';
    const demoData = {
      userId,
      name: 'Sanjay Jakhar',
      email: 'sanjay.jakhar@example.com',
      ats_score: 84,
      github_username: 'sanjayjakhar',
      skills: ['React', 'Node.js', 'Fastify', 'PostgreSQL', 'Docker', 'Redis', 'REST APIs', 'Git', 'JavaScript'],
      experience: [
        {
          role: 'Fullstack Developer Intern',
          company: 'InternOps Platform',
          duration: '2024 - Present',
          description: 'Built attendance tracking, task assignments, and rating systems using Fastify and PostgreSQL.',
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
        'Quantify results by adding response time metrics (e.g. reduced latency by 35%).',
        'Add a link to the live deployment or architecture diagrams in the repository README.',
        'Highlight familiarity with CI/CD pipeline automation and Docker compose.',
      ],
      fileName: 'sanjay_jakhar_resume.pdf',
      fileSize: 1048576,
    };

    const saved = await Resume.findOneAndUpdate({ userId }, demoData, { upsert: true, new: true });
    await Profile.findOneAndUpdate({ userId }, { github_username: 'sanjayjakhar' }, { upsert: true }).catch(() => {});

    return res.status(200).json({
      message: 'Demo resume saved to MongoDB',
      data: saved,
    });
  } catch (error) {
    console.error('Error saving demo resume to MongoDB:', error.message);
    return res.status(500).json({ message: 'Error saving demo data', details: error.message });
  }
};

/**
 * Delete resume from MongoDB
 */
export const deleteResume = async (req, res) => {
  try {
    const userId = req.user?.id || 'default_user';
    await Resume.deleteMany({ userId });
    return res.status(200).json({ message: 'Resume cleared from database' });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting resume', details: error.message });
  }
};

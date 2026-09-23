import mongoose from 'mongoose';
import Application from '../models/Application.model.js';
import { getEffectiveUserId } from '../middleware/auth.middleware.js';

/**
 * Get all applications for the active user from MongoDB
 */
export const getApplications = async (req, res) => {
  try {
    const userId = getEffectiveUserId(req);
    let apps = await Application.find({ userId }).sort({ createdAt: -1 });


    // Clean Zero-Slate: Do NOT auto-seed fake applications.
    // If the user has not added any applications, return empty list []
    return res.status(200).json({
      message: 'Applications retrieved from MongoDB',
      data: apps || [],
    });
  } catch (error) {
    console.error('Error fetching applications from MongoDB:', error.message);
    return res.status(500).json({
      message: 'Failed to retrieve applications',
      details: error.message,
    });
  }
};

/**
 * Explicitly seed realistic sample applications for testing or evaluation demo
 */
export const seedDemoApplications = async (req, res) => {
  try {
    const userId = getEffectiveUserId(req);
    // Clear existing for fresh sample
    await Application.deleteMany({ userId });

    const sampleApps = [
      {
        userId,
        company: 'Razorpay',
        role: 'Frontend Engineer - Intern',
        location: 'Bengaluru, India (Hybrid)',
        status: 'interviewing',
        appliedDate: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0],
        matchScore: 92,
      },
      {
        userId,
        company: 'Postman',
        role: 'Backend API Developer',
        location: 'Bengaluru, India (Remote)',
        status: 'interviewing',
        appliedDate: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
        matchScore: 88,
      },
      {
        userId,
        company: 'Zerodha',
        role: 'Junior Fullstack Engineer',
        location: 'Bengaluru, India',
        status: 'applied',
        appliedDate: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
        matchScore: 85,
      },
      {
        userId,
        company: 'CRED',
        role: 'Software Engineer - Platform',
        location: 'Bengaluru, India',
        status: 'applied',
        appliedDate: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0],
        matchScore: 79,
      },
      {
        userId,
        company: 'Zomato',
        role: 'Associate Software Developer',
        location: 'Gurugram, India',
        status: 'offer',
        appliedDate: new Date(Date.now() - 25 * 86400000).toISOString().split('T')[0],
        matchScore: 94,
      },
    ];

    const seeded = await Application.insertMany(sampleApps);
    return res.status(201).json({
      message: 'Sample demo applications loaded successfully',
      data: seeded,
    });
  } catch (error) {
    console.error('Error seeding demo applications:', error.message);
    return res.status(500).json({ message: 'Failed to seed demo applications', details: error.message });
  }
};

/**
 * Reset all applications to clean zero slate
 */
export const resetApplications = async (req, res) => {
  try {
    const userId = getEffectiveUserId(req);
    await Application.deleteMany({ userId });
    return res.status(200).json({ message: 'All applications cleared to clean zero slate' });
  } catch (error) {
    console.error('Error clearing applications:', error.message);
    return res.status(500).json({ message: 'Failed to clear applications', details: error.message });
  }
};

/**
 * Create a new application in MongoDB
 */
export const createApplication = async (req, res) => {
  try {
    const userId = getEffectiveUserId(req);
    const { company, role, location, status, matchScore, appliedDate } = req.body;


    if (!company || !role) {
      return res.status(400).json({ message: 'Company and Role are required' });
    }

    const app = await Application.create({
      userId,
      company,
      role,
      location: location || 'Remote',
      status: status || 'applied',
      matchScore: matchScore || 85,
      appliedDate: appliedDate || new Date().toISOString().split('T')[0],
    });

    return res.status(201).json({
      message: 'Application saved to MongoDB',
      data: app,
    });
  } catch (error) {
    console.error('Error creating application in MongoDB:', error.message);
    return res.status(500).json({
      message: 'Failed to save application',
      details: error.message,
    });
  }
};

/**
 * Update application status or details in MongoDB
 */
export const updateApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    let updated = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      updated = await Application.findByIdAndUpdate(id, updateData, { new: true });
    }
    if (!updated) {
      updated = await Application.findOneAndUpdate(
        { $or: [{ _id: id }, { customId: id }, { id }] },
        updateData,
        { new: true }
      );
    }

    if (!updated) {
      return res.status(404).json({ message: 'Application not found' });
    }

    return res.status(200).json({
      message: 'Application updated in MongoDB',
      data: updated,
    });
  } catch (error) {
    console.error('Error updating application in MongoDB:', error.message);
    return res.status(500).json({
      message: 'Failed to update application',
      details: error.message,
    });
  }
};

/**
 * Delete an application from MongoDB
 */
export const deleteApplication = async (req, res) => {
  try {
    const { id } = req.params;
    if (mongoose.Types.ObjectId.isValid(id)) {
      await Application.findByIdAndDelete(id);
    } else {
      await Application.findOneAndDelete({ $or: [{ _id: id }, { customId: id }, { id }] });
    }

    return res.status(200).json({ message: 'Application deleted from MongoDB' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete application', details: error.message });
  }
};

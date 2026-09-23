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


    // If none exist yet, seed initial realistic defaults into MongoDB
    if (apps.length === 0) {
      const defaultApps = [
        {
          userId,
          company: 'Razorpay',
          role: 'Frontend Engineer - Intern to PPO',
          location: 'Bengaluru, India (Hybrid)',
          status: 'interviewing',
          appliedDate: '2026-09-14',
          matchScore: 92,
        },
        {
          userId,
          company: 'Postman',
          role: 'Backend API Developer',
          location: 'Bengaluru, India (Remote)',
          status: 'interviewing',
          appliedDate: '2026-09-17',
          matchScore: 88,
        },
        {
          userId,
          company: 'Zerodha',
          role: 'Junior Fullstack Engineer',
          location: 'Bengaluru, India',
          status: 'applied',
          appliedDate: '2026-09-19',
          matchScore: 85,
        },
        {
          userId,
          company: 'CRED',
          role: 'Software Engineer - Platform',
          location: 'Bengaluru, India',
          status: 'applied',
          appliedDate: '2026-09-20',
          matchScore: 79,
        },
        {
          userId,
          company: 'Zomato',
          role: 'Associate Software Developer',
          location: 'Gurugram, India',
          status: 'offer',
          appliedDate: '2026-08-28',
          matchScore: 94,
        },
      ];

      apps = await Application.insertMany(defaultApps);
    }

    return res.status(200).json({
      message: 'Applications retrieved from MongoDB',
      data: apps,
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

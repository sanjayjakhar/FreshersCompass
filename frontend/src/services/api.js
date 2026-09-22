import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

// ---------- Resume APIs (MongoDB) ----------
export const fetchLatestResume = async () => {
  try {
    const res = await api.get('/resume/latest');
    return res.data?.data || null;
  } catch (err) {
    console.error('Error fetching resume from MongoDB:', err);
    return null;
  }
};

export const uploadResumeToDB = async (file) => {
  const formData = new FormData();
  formData.append('resume', file);
  const res = await api.post('/resume/upload', formData);
  return res.data?.data;
};

export const seedDemoResumeToDB = async () => {
  const res = await api.post('/resume/demo');
  return res.data?.data;
};

export const deleteResumeFromDB = async () => {
  await api.delete('/resume');
};

// ---------- Profile & GitHub APIs (MongoDB) ----------
export const fetchProfileFromDB = async () => {
  try {
    const res = await api.get('/profile');
    return res.data?.data || null;
  } catch (err) {
    console.error('Error fetching profile from MongoDB:', err);
    return null;
  }
};

export const updateProfileInDB = async (profileData) => {
  const res = await api.post('/profile', profileData);
  return res.data?.data;
};

// ---------- Application Tracker APIs (MongoDB) ----------
export const fetchApplicationsFromDB = async () => {
  try {
    const res = await api.get('/applications');
    return res.data?.data || [];
  } catch (err) {
    console.error('Error fetching applications from MongoDB:', err);
    return [];
  }
};

export const createApplicationInDB = async (appData) => {
  const res = await api.post('/applications', appData);
  return res.data?.data;
};

export const updateApplicationInDB = async (id, updateData) => {
  const res = await api.patch(`/applications/${id}`, updateData);
  return res.data?.data;
};

export const deleteApplicationFromDB = async (id) => {
  await api.delete(`/applications/${id}`);
};

export default api;

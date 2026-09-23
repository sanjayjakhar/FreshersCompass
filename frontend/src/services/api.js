import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

// Simple in-memory cache and in-flight promise deduplication to accelerate page opening
let pendingResumePromise = null;
let cachedResume = null;
let resumeCacheExpiry = 0;

let pendingProfilePromise = null;
let cachedProfile = null;
let profileCacheExpiry = 0;

export const invalidateResumeCache = () => {
  cachedResume = null;
  resumeCacheExpiry = 0;
  pendingResumePromise = null;
};

export const invalidateProfileCache = () => {
  cachedProfile = null;
  profileCacheExpiry = 0;
  pendingProfilePromise = null;
};

// ---------- Resume APIs (MongoDB) ----------
export const fetchLatestResume = async (force = false) => {
  const now = Date.now();
  if (!force && cachedResume !== null && now < resumeCacheExpiry) {
    return cachedResume;
  }

  if (pendingResumePromise) {
    return pendingResumePromise;
  }

  pendingResumePromise = (async () => {
    try {
      const res = await api.get('/resume/latest');
      const data = res.data?.data || null;
      cachedResume = data;
      resumeCacheExpiry = Date.now() + 8000; // 8s TTL
      return data;
    } catch (err) {
      console.error('Error fetching resume from MongoDB:', err);
      return null;
    } finally {
      pendingResumePromise = null;
    }
  })();

  return pendingResumePromise;
};

export const uploadResumeToDB = async (file) => {
  invalidateResumeCache();
  const formData = new FormData();
  formData.append('resume', file);
  const res = await api.post('/resume/upload', formData);
  cachedResume = res.data?.data;
  resumeCacheExpiry = Date.now() + 8000;
  return res.data?.data;
};

export const seedDemoResumeToDB = async () => {
  invalidateResumeCache();
  const res = await api.post('/resume/demo');
  cachedResume = res.data?.data;
  resumeCacheExpiry = Date.now() + 8000;
  return res.data?.data;
};

export const deleteResumeFromDB = async () => {
  invalidateResumeCache();
  await api.delete('/resume');
};

// ---------- Profile & GitHub APIs (MongoDB) ----------
export const fetchProfileFromDB = async (force = false) => {
  const now = Date.now();
  if (!force && cachedProfile !== null && now < profileCacheExpiry) {
    return cachedProfile;
  }

  if (pendingProfilePromise) {
    return pendingProfilePromise;
  }

  pendingProfilePromise = (async () => {
    try {
      const res = await api.get('/profile');
      const data = res.data?.data || null;
      cachedProfile = data;
      profileCacheExpiry = Date.now() + 8000; // 8s TTL
      return data;
    } catch (err) {
      console.error('Error fetching profile from MongoDB:', err);
      return null;
    } finally {
      pendingProfilePromise = null;
    }
  })();

  return pendingProfilePromise;
};

export const updateProfileInDB = async (profileData) => {
  invalidateProfileCache();
  const res = await api.post('/profile', profileData);
  cachedProfile = res.data?.data;
  profileCacheExpiry = Date.now() + 8000;
  return res.data?.data;
};

export const fetchPublicProfile = async (username) => {
  try {
    const res = await api.get(`/profile/public/${encodeURIComponent(username)}`);
    return res.data?.data || null;
  } catch (err) {
    console.error('Error fetching public profile:', err);
    return null;
  }
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

export const seedDemoApplicationsToDB = async () => {
  const res = await api.post('/applications/seed-demo');
  return res.data?.data || [];
};

export const resetApplicationsInDB = async () => {
  await api.post('/applications/reset');
};

// ---------- AI Interview APIs ----------
export const evaluateInterviewSession = async (responses, role) => {
  const res = await api.post('/interview/evaluate', { responses, role });
  return res.data?.data;
};

// ---------- Diagnostics & Health APIs ----------
export const fetchDiagnostics = async () => {
  const res = await api.get('/health/diagnostics');
  return res.data;
};

export { API_BASE, api };
export default api;



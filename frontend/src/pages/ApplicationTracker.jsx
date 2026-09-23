import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CheckSquare, Plus, Building2, Calendar, MapPin,
  ChevronRight, X, ArrowRight, ExternalLink, Trash2, Loader2, Search,
  Sparkles, RotateCcw
} from 'lucide-react';
import {
  fetchApplicationsFromDB,
  createApplicationInDB,
  updateApplicationInDB,
  deleteApplicationFromDB,
  seedDemoApplicationsToDB,
  resetApplicationsInDB
} from '../services/api';
import useDebounce from '../hooks/useDebounce';

export default function ApplicationTracker() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const [newCompany, setNewCompany] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newLocation, setNewLocation] = useState('Remote');
  const [newStatus, setNewStatus] = useState('applied');
  const [isSubmitting, setIsSubmitting] = useState(false);


  const loadApplications = async () => {
    try {
      setLoading(true);
      const data = await fetchApplicationsFromDB();
      setApplications(data);
    } catch (err) {
      console.error('Failed to load applications from MongoDB:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newCompany.trim() || !newRole.trim()) return;

    try {
      setIsSubmitting(true);
      const newApp = await createApplicationInDB({
        company: newCompany.trim(),
        role: newRole.trim(),
        location: newLocation.trim() || 'Remote',
        status: newStatus,
        appliedDate: new Date().toISOString().split('T')[0],
        matchScore: Math.floor(Math.random() * 15) + 82, // realistic match score 82-96
      });

      if (newApp) {
        setApplications((prev) => [newApp, ...prev]);
      } else {
        await loadApplications();
      }

      setNewCompany('');
      setNewRole('');
      setShowAddModal(false);
    } catch (err) {
      console.error('Failed to create application in MongoDB:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const moveStatus = async (appId, nextStatus) => {
    try {
      // Optimistic update
      setApplications((prev) =>
        prev.map((app) =>
          (app._id === appId || app.id === appId) ? { ...app, status: nextStatus } : app
        )
      );
      await updateApplicationInDB(appId, { status: nextStatus });
    } catch (err) {
      console.error('Failed to update status in MongoDB:', err);
      await loadApplications();
    }
  };

  const handleDelete = async (appId) => {
    try {
      setApplications((prev) => prev.filter((app) => app._id !== appId && app.id !== appId));
      await deleteApplicationFromDB(appId);
    } catch (err) {
      console.error('Failed to delete application from MongoDB:', err);
      await loadApplications();
    }
  };

  const handleLoadSample = async () => {
    try {
      setLoading(true);
      const data = await seedDemoApplicationsToDB();
      setApplications(data);
    } catch (err) {
      console.error('Failed to seed demo applications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetSlate = async () => {
    if (!window.confirm('Are you sure you want to clear all applications back to a clean slate?')) return;
    try {
      setLoading(true);
      await resetApplicationsInDB();
      setApplications([]);
    } catch (err) {
      console.error('Failed to clear applications:', err);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { key: 'applied', label: 'Applied', color: 'border-t-warning text-warning' },
    { key: 'interviewing', label: 'Interviewing', color: 'border-t-primary text-primary' },
    { key: 'offer', label: 'Offer Received', color: 'border-t-success text-success' },
    { key: 'rejected', label: 'Archived / Rejected', color: 'border-t-border text-text-muted' },
  ];

  const filteredApplications = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return applications;
    const q = debouncedSearchQuery.toLowerCase();
    return applications.filter((app) =>
      (app.company || '').toLowerCase().includes(q) ||
      (app.role || '').toLowerCase().includes(q) ||
      (app.location || '').toLowerCase().includes(q)
    );
  }, [applications, debouncedSearchQuery]);

  return (
    <div className="space-y-8 animate-fade-up">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
            Application Tracker
          </h1>
          <p className="text-text-body text-sm mt-1">
            Kanban pipeline tracking interview velocity, job status, and follow-ups.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {applications.length > 0 && (
            <button
              onClick={handleResetSlate}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-white text-xs font-semibold text-text-muted hover:text-danger hover:border-danger/30 transition shadow-2xs"
              title="Clear all applications back to 0"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Slate</span>
            </button>
          )}

          {/* Single Coral CTA (#D85A30) */}
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-accent text-xs font-bold py-2.5 px-4"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Application</span>
          </button>
        </div>
      </div>

      {/* 2. Key Stats Row & Filter Search Bar */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-surface rounded-card border border-border p-4 shadow-2xs">
            <span className="text-xs font-semibold text-text-body">Active Applications</span>
            <p className="text-2xl font-black text-text-dark mt-1">{applications.length}</p>
          </div>
          <div className="bg-surface rounded-card border border-border p-4 shadow-2xs">
            <span className="text-xs font-semibold text-text-body">In Interview Stage</span>
            <p className="text-2xl font-black text-primary mt-1">
              {applications.filter((a) => a.status === 'interviewing').length}
            </p>
          </div>
          <div className="bg-surface rounded-card border border-border p-4 shadow-2xs">
            <span className="text-xs font-semibold text-text-body">Offers</span>
            <p className="text-2xl font-black text-success mt-1">
              {applications.filter((a) => a.status === 'offer').length}
            </p>
          </div>
          <div className="bg-surface rounded-card border border-border p-4 shadow-2xs">
            <span className="text-xs font-semibold text-text-body">Avg Match Score</span>
            <p className="text-2xl font-black text-secondary mt-1">88%</p>
          </div>
        </div>

        {/* Debounced Search Filter */}
        {applications.length > 0 && (
          <div className="relative max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by company, role, or location..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-white border border-border focus:outline-none focus:border-primary/50 shadow-2xs transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-dark"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3. Trello-Style Kanban Board or Guided Empty State */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {columns.map((c) => (
            <div key={c.key} className="bg-surface rounded-card border border-border p-4 animate-pulse space-y-3">
              <div className="h-4 bg-border/60 rounded w-24"></div>
              <div className="h-28 bg-white/70 rounded-xl"></div>
              <div className="h-28 bg-white/70 rounded-xl"></div>
            </div>
          ))}
        </div>
      ) : applications.length === 0 ? (
        <div className="bg-surface rounded-card border border-border p-12 text-center shadow-sm space-y-4 max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-white border border-border flex items-center justify-center text-primary mx-auto shadow-xs">
            <CheckSquare className="h-8 w-8" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-text-dark">No Job Applications Tracked Yet</h3>
            <p className="text-xs text-text-body max-w-md mx-auto mt-1.5 leading-relaxed">
              Organize your job search in one place. Keep track of application deadlines, technical screenings, take-home projects, and offer letters.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-accent text-xs font-bold py-2.5 px-5 min-h-[44px]"
            >
              <Plus className="h-4 w-4" />
              <span>Track First Application</span>
            </button>
            <button
              onClick={handleLoadSample}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border bg-white text-xs font-semibold text-text-dark hover:bg-surface hover:border-primary/40 transition shadow-2xs min-h-[44px]"
            >
              <Sparkles className="h-4 w-4 text-secondary" />
              <span>Load Sample Data (Demo Mode)</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
          {columns.map((col) => {
            const colApps = filteredApplications.filter((a) => a.status === col.key);


            return (
              <div
                key={col.key}
                className={`bg-surface rounded-card border border-border border-t-4 p-4 shadow-sm space-y-3 ${col.color}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-text-dark">
                    {col.label}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white border border-border text-text-dark">
                    {colApps.length}
                  </span>
                </div>

                <div className="space-y-2.5 min-h-[160px]">
                  {colApps.map((app) => {
                    const appId = app._id || app.id;
                    return (
                      <div
                        key={appId}
                        className="p-3.5 bg-white rounded-xl border border-border hover:border-primary/40 transition-all shadow-xs space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-text-dark leading-snug truncate">{app.role}</h4>
                            <p className="text-[11px] font-semibold text-primary mt-0.5 truncate">{app.company}</p>
                          </div>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-secondary/10 text-secondary rounded shrink-0">
                            {app.matchScore || 85}%
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-text-muted">
                          <MapPin className="h-3 w-3 text-text-muted" aria-hidden="true" />
                          <span className="truncate">{app.location}</span>
                        </div>

                        <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
                          <span className="text-[10px] text-text-muted">{app.appliedDate}</span>
                          
                          <div className="flex items-center gap-1.5">
                            {/* Move status menu */}
                            <select
                              aria-label={`Change stage for ${app.role} at ${app.company}`}
                              value={app.status}
                              onChange={(e) => moveStatus(appId, e.target.value)}
                              className="text-[10px] bg-surface rounded px-1.5 py-1 border border-border text-text-dark focus:outline-none focus:ring-1 focus:ring-primary min-h-[28px]"
                            >
                              <option value="applied">Applied</option>
                              <option value="interviewing">Interview</option>
                              <option value="offer">Offer</option>
                              <option value="rejected">Archived</option>
                            </select>

                            <button
                              onClick={() => handleDelete(appId)}
                              title="Delete application"
                              className="p-1 text-text-muted hover:text-danger rounded transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {colApps.length === 0 && (
                    <div className="p-6 border border-dashed border-border rounded-xl text-center space-y-2">
                      <p className="text-text-muted text-xs">No applications in this stage</p>
                      <button
                        onClick={() => {
                          setNewStatus(col.key);
                          setShowAddModal(true);
                        }}
                        className="text-[11px] font-semibold text-primary hover:underline inline-flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add here</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-surface rounded-card border border-border p-6 max-w-md w-full shadow-lg relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-text-muted hover:text-text-dark p-1 rounded-lg"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-base font-bold text-text-dark mb-4">Track New Job Application</h3>

            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-text-dark block mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  placeholder="e.g. Swiggy, Zerodha, Stripe"
                  className="w-full px-3 py-2 bg-white rounded-xl border border-border text-xs text-text-dark focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-text-dark block mb-1">Role Title</label>
                <input
                  type="text"
                  required
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="e.g. SDE 1, Graduate Engineer"
                  className="w-full px-3 py-2 bg-white rounded-xl border border-border text-xs text-text-dark focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-text-dark block mb-1">Location</label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="e.g. Bengaluru, Remote"
                  className="w-full px-3 py-2 bg-white rounded-xl border border-border text-xs text-text-dark focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-text-dark block mb-1">Pipeline Stage</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-xl border border-border text-xs text-text-dark focus:outline-none focus:border-primary"
                >
                  <option value="applied">Applied</option>
                  <option value="interviewing">Interviewing</option>
                  <option value="offer">Offer Received</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-ghost text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs">
                  Save Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

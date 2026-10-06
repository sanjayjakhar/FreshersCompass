import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CheckSquare, Plus, Building2, Calendar, MapPin,
  ChevronRight, X, ArrowRight, ExternalLink, Trash2, Loader2, Search,
  Sparkles, RotateCcw, LayoutGrid, List, Download, FileSpreadsheet, FileJson,
  GripVertical, CalendarPlus, Clock, AlertCircle
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
import useFocusTrap from '../hooks/useFocusTrap';

export default function ApplicationTracker() {
  const [showAddModal, setShowAddModal] = useState(false);
  const modalRef = useFocusTrap(showAddModal, () => setShowAddModal(false));
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'list'
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Drag and drop state
  const [draggedAppId, setDraggedAppId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  const [newCompany, setNewCompany] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newLocation, setNewLocation] = useState('Remote');
  const [newStatus, setNewStatus] = useState('applied');
  const [newJobUrl, setNewJobUrl] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [newInterviewDate, setNewInterviewDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getUrgencyBadge = useCallback((app) => {
    const rawDate = app.deadlineDate || app.deadline || app.interviewDate || app.interviewDateTime;
    if (!rawDate) return null;

    const targetDate = new Date(rawDate);
    if (isNaN(targetDate.getTime())) return null;

    const now = new Date();
    const diffHours = (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    const isInterview = Boolean(app.interviewDate || app.interviewDateTime);
    const prefix = isInterview ? 'Interview' : 'Deadline';

    if (diffHours < 0) {
      return {
        label: `${prefix}: Past`,
        className: 'bg-red-500/10 text-red-600 border border-red-200/70',
        isUrgent: false,
      };
    }
    if (diffHours <= 24) {
      return {
        label: `${prefix}: < 24h!`,
        className: 'bg-red-500/15 text-red-700 border border-red-300 font-bold animate-pulse',
        isUrgent: true,
      };
    }
    if (diffHours <= 72) {
      return {
        label: `${prefix}: < 3 days`,
        className: 'bg-amber-500/15 text-amber-700 border border-amber-300 font-semibold',
        isUrgent: true,
      };
    }
    return {
      label: `${prefix}: ${rawDate}`,
      className: 'bg-slate-100 text-slate-700 border border-slate-200',
      isUrgent: false,
    };
  }, []);

  const downloadICS = useCallback((app) => {
    const rawDate = app.interviewDate || app.interviewDateTime || app.deadlineDate || app.deadline;
    const eventDate = rawDate ? new Date(rawDate) : new Date(Date.now() + 86400000);
    const isInterview = Boolean(app.interviewDate || app.interviewDateTime);
    const title = `${isInterview ? 'Interview Round' : 'Application Deadline'}: ${app.role} at ${app.company}`;
    const description = `FreshersCompass Application Tracker\nCompany: ${app.company}\nRole: ${app.role}\nLocation: ${app.location || 'Remote'}\nStatus: ${app.status}\nMatch Score: ${app.matchScore || 85}%`;

    const formatICS = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const start = formatICS(eventDate);
    const end = formatICS(new Date(eventDate.getTime() + 60 * 60 * 1000));

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//FreshersCompass//Career Pipeline//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:fc-${app._id || app.id || Date.now()}@fresherscompass.local`,
      `DTSTAMP:${formatICS(new Date())}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
      `LOCATION:${app.location || 'Remote / Online'}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${app.company.replace(/[^a-zA-Z0-9]/g, '_')}_interview.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const openGoogleCalendar = useCallback((app) => {
    const rawDate = app.interviewDate || app.interviewDateTime || app.deadlineDate || app.deadline;
    const eventDate = rawDate ? new Date(rawDate) : new Date(Date.now() + 86400000);
    const isInterview = Boolean(app.interviewDate || app.interviewDateTime);
    const title = encodeURIComponent(`${isInterview ? 'Interview' : 'Application Deadline'}: ${app.role} at ${app.company}`);
    const details = encodeURIComponent(`FreshersCompass Career Pipeline\nRole: ${app.role}\nCompany: ${app.company}\nLocation: ${app.location || 'Remote'}`);
    const loc = encodeURIComponent(app.location || 'Remote / Online');

    const formatGCal = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const start = formatGCal(eventDate);
    const end = formatGCal(new Date(eventDate.getTime() + 60 * 60 * 1000));

    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${loc}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);
  const loadApplications = async () => {
    try {
      setLoading(true);
      const data = await fetchApplicationsFromDB();
      setApplications(data || []);
    } catch (err) {
      console.error('Failed to load applications from MongoDB:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  // Let other pages (e.g. the Job Recommendations feed) know the pipeline changed.
  const broadcastApplicationsUpdated = useCallback(() => {
    window.dispatchEvent(new CustomEvent('freshercompass_applications_updated'));
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
        jobUrl: newJobUrl.trim(),
        appliedDate: new Date().toISOString().split('T')[0],
        deadlineDate: newDeadline.trim(),
        deadline: newDeadline.trim(),
        interviewDate: newInterviewDate.trim(),
        interviewDateTime: newInterviewDate.trim(),
        matchScore: Math.floor(Math.random() * 15) + 82, // realistic match score 82-96
      });

      if (newApp) {
        setApplications((prev) => [newApp, ...prev]);
        broadcastApplicationsUpdated();
      } else {
        await loadApplications();
      }

      setNewCompany('');
      setNewRole('');
      setNewLocation('Remote');
      setNewStatus('applied');
      setNewJobUrl('');
      setNewDeadline('');
      setNewInterviewDate('');
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
      broadcastApplicationsUpdated();
    } catch (err) {
      console.error('Failed to delete application from MongoDB:', err);
      await loadApplications();
    }
  };

  const handleLoadSample = async () => {
    try {
      setLoading(true);
      const data = await seedDemoApplicationsToDB();
      setApplications(data || []);
      broadcastApplicationsUpdated();
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
      broadcastApplicationsUpdated();
    } catch (err) {
      console.error('Failed to clear applications:', err);
    } finally {
      setLoading(false);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e, appId) => {
    e.dataTransfer.setData('text/plain', appId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedAppId(appId);
  };

  const handleDragOver = (e, colKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCol !== colKey) {
      setDragOverCol(colKey);
    }
  };

  const handleDragLeave = (e) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setDragOverCol(null);
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    const appId = e.dataTransfer.getData('text/plain') || draggedAppId;
    setDraggedAppId(null);
    if (!appId) return;

    const currentApp = applications.find(a => (a._id === appId || a.id === appId));
    if (currentApp && currentApp.status !== targetStatus) {
      await moveStatus(appId, targetStatus);
    }
  };

  // Export handlers
  const handleExportCSV = () => {
    if (!applications.length) return;
    const headers = ['Company', 'Role', 'Location', 'Status', 'Match Score', 'Applied Date', 'Job URL'];
    const rows = applications.map((a) => [
      `"${(a.company || '').replace(/"/g, '""')}"`,
      `"${(a.role || '').replace(/"/g, '""')}"`,
      `"${(a.location || '').replace(/"/g, '""')}"`,
      `"${a.status || 'applied'}"`,
      `"${a.matchScore || ''}"`,
      `"${a.appliedDate || ''}"`,
      `"${(a.jobUrl || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `fresherscompass_applications_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportMenu(false);
  };

  const handleExportJSON = () => {
    if (!applications.length) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(applications, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `fresherscompass_applications_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportMenu(false);
  };

  const columns = [
    { key: 'applied', label: 'Applied', color: 'border-t-warning text-warning' },
    { key: 'screening', label: 'Screening', color: 'border-t-purple-500 text-purple-600' },
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

  const avgMatchScore = useMemo(() => {
    if (!applications.length) return 85;
    const sum = applications.reduce((acc, a) => acc + (a.matchScore || 85), 0);
    return Math.round(sum / applications.length);
  }, [applications]);

  return (
    <div className="space-y-8 animate-fade-up">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
            Application Tracker
          </h1>
          <p className="text-text-body text-sm mt-1">
            Kanban & list pipeline tracking interview velocity, job status, and follow-ups.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-white border border-border rounded-xl p-1 shadow-2xs">
            <button
              onClick={() => setViewMode('kanban')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'kanban'
                  ? 'bg-primary text-white shadow-2xs'
                  : 'text-text-muted hover:text-text-dark'
              }`}
              title="Kanban Board View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'list'
                  ? 'bg-primary text-white shadow-2xs'
                  : 'text-text-muted hover:text-text-dark'
              }`}
              title="List View"
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>

          {/* Export Menu */}
          {applications.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-white text-xs font-semibold text-text-dark hover:bg-surface transition shadow-2xs cursor-pointer"
                title="Export tracked applications"
              >
                <Download className="h-3.5 w-3.5 text-primary" />
                <span>Export</span>
              </button>

              {showExportMenu && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setShowExportMenu(false)}
                  />
                  <div className="absolute right-0 mt-1.5 w-44 bg-white rounded-xl border border-border shadow-lg p-1 z-30 space-y-0.5 animate-scale-in">
                    <button
                      onClick={handleExportCSV}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-text-dark hover:bg-surface rounded-lg transition-colors text-left"
                    >
                      <FileSpreadsheet className="h-4 w-4 text-success" />
                      <span>Export as CSV</span>
                    </button>
                    <button
                      onClick={handleExportJSON}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-text-dark hover:bg-surface rounded-lg transition-colors text-left"
                    >
                      <FileJson className="h-4 w-4 text-primary" />
                      <span>Export as JSON</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

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

          {/* Add Application CTA */}
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
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
          <div className="bg-surface rounded-card border border-border p-3.5 shadow-2xs">
            <span className="text-xs font-semibold text-text-body">Total Tracked</span>
            <p className="text-xl sm:text-2xl font-black text-text-dark mt-1">{applications.length}</p>
          </div>
          <div className="bg-surface rounded-card border border-border p-3.5 shadow-2xs">
            <span className="text-xs font-semibold text-text-body">Screening</span>
            <p className="text-xl sm:text-2xl font-black text-purple-600 mt-1">
              {applications.filter((a) => a.status === 'screening').length}
            </p>
          </div>
          <div className="bg-surface rounded-card border border-border p-3.5 shadow-2xs">
            <span className="text-xs font-semibold text-text-body">Interviewing</span>
            <p className="text-xl sm:text-2xl font-black text-primary mt-1">
              {applications.filter((a) => a.status === 'interviewing').length}
            </p>
          </div>
          <div className="bg-surface rounded-card border border-border p-3.5 shadow-2xs">
            <span className="text-xs font-semibold text-text-body">Offers</span>
            <p className="text-xl sm:text-2xl font-black text-success mt-1">
              {applications.filter((a) => a.status === 'offer').length}
            </p>
          </div>
          <div className="bg-surface rounded-card border border-border p-3.5 shadow-2xs">
            <span className="text-xs font-semibold text-text-body">Avg Match</span>
            <p className="text-xl sm:text-2xl font-black text-secondary mt-1">{avgMatchScore}%</p>
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

      {/* 3. Main Views: Kanban vs List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
      ) : viewMode === 'kanban' ? (
        /* KANBAN BOARD VIEW WITH DRAG & DROP */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-start">
          {columns.map((col) => {
            const colApps = filteredApplications.filter((a) => a.status === col.key);
            const isOver = dragOverCol === col.key;

            return (
              <div
                key={col.key}
                onDragOver={(e) => handleDragOver(e, col.key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.key)}
                className={`bg-surface rounded-card border border-t-4 p-3.5 shadow-sm space-y-3 transition-colors ${
                  isOver ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border'
                } ${col.color}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-text-dark">
                    {col.label}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white border border-border text-text-dark">
                    {colApps.length}
                  </span>
                </div>

                <div className="space-y-2.5 min-h-[180px]">
                  {colApps.map((app) => {
                    const appId = app._id || app.id;
                    const isDragging = draggedAppId === appId;
                    const urgency = getUrgencyBadge(app);

                    return (
                      <div
                        key={appId}
                        draggable
                        onDragStart={(e) => handleDragStart(e, appId)}
                        onDragEnd={() => {
                          setDraggedAppId(null);
                          setDragOverCol(null);
                        }}
                        className={`p-3 bg-white rounded-xl border border-border hover:border-primary/40 transition-all shadow-xs space-y-2 cursor-grab active:cursor-grabbing ${
                          isDragging ? 'opacity-40 scale-95 border-dashed border-primary' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-text-dark leading-snug truncate">{app.role}</h4>
                            <p className="text-[11px] font-semibold text-primary mt-0.5 truncate">{app.company}</p>
                          </div>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-secondary/10 text-secondary rounded shrink-0">
                            {app.matchScore || 85}%
                          </span>
                        </div>

                        {/* Urgency Badge if deadline or interview is set */}
                        {urgency && (
                          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] ${urgency.className}`}>
                            {urgency.isUrgent ? (
                              <AlertCircle className="h-3 w-3 shrink-0" />
                            ) : (
                              <Clock className="h-3 w-3 shrink-0" />
                            )}
                            <span className="truncate">{urgency.label}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-text-muted">
                          <div className="flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3 text-text-muted shrink-0" aria-hidden="true" />
                            <span className="truncate">{app.location || 'Remote'}</span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {app.jobUrl && (
                              <a
                                href={app.jobUrl}
                                target="_blank"
                                rel="noreferrer"
                                title="Open original job posting"
                                className="text-primary hover:underline inline-flex items-center gap-0.5 p-1"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                            {/* 1-Click Calendar Sync */}
                            <button
                              onClick={() => downloadICS(app)}
                              title="Download iCal (.ics) Calendar Invite"
                              className="p-1 rounded text-text-muted hover:text-primary hover:bg-surface transition-colors"
                            >
                              <CalendarPlus className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => openGoogleCalendar(app)}
                              title="Add event to Google Calendar"
                              className="px-1.5 py-0.5 text-[9px] font-bold rounded border border-border text-text-muted hover:text-primary hover:border-primary/40 transition-colors"
                            >
                              +GCal
                            </button>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
                          <span className="text-[10px] text-text-muted">{app.appliedDate}</span>
                          
                          <div className="flex items-center gap-1.5">
                            {/* Move status menu */}
                            <select
                              aria-label={`Change stage for ${app.role} at ${app.company}`}
                              value={app.status}
                              onChange={(e) => moveStatus(appId, e.target.value)}
                              className="text-[10px] bg-surface rounded px-1.5 py-1 border border-border text-text-dark focus:outline-none focus:ring-1 focus:ring-primary min-h-[26px]"
                            >
                              <option value="applied">Applied</option>
                              <option value="screening">Screening</option>
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
                      <p className="text-text-muted text-xs">No applications</p>
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
      ) : (
        /* LIST VIEW TABLE */
        <div className="bg-white rounded-card border border-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface border-b border-border text-text-muted font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Role & Company</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Pipeline Stage</th>
                  <th className="py-3 px-4">Match Score</th>
                  <th className="py-3 px-4">Applied Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-text-dark">
                {filteredApplications.map((app) => {
                  const appId = app._id || app.id;
                  const stageBadgeColors = {
                    applied: 'bg-warning/10 text-warning border-warning/20',
                    screening: 'bg-purple-50 text-purple-600 border-purple-200',
                    interviewing: 'bg-primary/10 text-primary border-primary/20',
                    offer: 'bg-success/10 text-success border-success/20',
                    rejected: 'bg-surface text-text-muted border-border',
                  };

                  return (
                    <tr key={appId} className="hover:bg-surface/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-text-dark text-xs">{app.role}</div>
                        <div className="text-[11px] font-medium text-primary mt-0.5">{app.company}</div>
                      </td>
                      <td className="py-3.5 px-4 text-text-body">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-text-muted shrink-0" />
                          <span>{app.location || 'Remote'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          value={app.status}
                          onChange={(e) => moveStatus(appId, e.target.value)}
                          className={`text-xs font-semibold px-2 py-1 rounded-lg border focus:outline-none focus:ring-1 focus:ring-primary ${
                            stageBadgeColors[app.status] || 'bg-surface text-text-dark border-border'
                          }`}
                        >
                          <option value="applied">Applied</option>
                          <option value="screening">Screening</option>
                          <option value="interviewing">Interviewing</option>
                          <option value="offer">Offer</option>
                          <option value="rejected">Archived</option>
                        </select>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold px-2 py-0.5 bg-secondary/10 text-secondary rounded-md text-[11px]">
                          {app.matchScore || 85}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-text-muted font-mono text-[11px]">
                        {app.appliedDate || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          {app.jobUrl && (
                            <a
                              href={app.jobUrl}
                              target="_blank"
                              rel="noreferrer"
                              title="Open original job posting"
                              className="p-1 text-text-muted hover:text-primary rounded transition-colors"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                          <button
                            onClick={() => handleDelete(appId)}
                            title="Delete application"
                            className="p-1 text-text-muted hover:text-danger rounded transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-app-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
        >
          <div ref={modalRef} className="bg-surface rounded-card border border-border p-6 max-w-md w-full shadow-lg relative">
            <button
              onClick={() => setShowAddModal(false)}
              aria-label="Close dialog"
              className="absolute top-4 right-4 text-text-muted hover:text-text-dark p-1 rounded-lg cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 id="add-app-modal-title" className="text-base font-bold text-text-dark mb-4">Track New Job Application</h3>

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
                <label className="text-xs font-bold text-text-dark block mb-1">Job URL (optional)</label>
                <input
                  type="url"
                  value={newJobUrl}
                  onChange={(e) => setNewJobUrl(e.target.value)}
                  placeholder="https://..."
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
                  <option value="screening">Screening</option>
                  <option value="interviewing">Interviewing</option>
                  <option value="offer">Offer Received</option>
                  <option value="rejected">Archived / Rejected</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-text-dark block mb-1">OA / App Deadline</label>
                  <input
                    type="date"
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-border text-xs text-text-dark focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-text-dark block mb-1">Interview Date & Time</label>
                  <input
                    type="datetime-local"
                    value={newInterviewDate}
                    onChange={(e) => setNewInterviewDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-border text-xs text-text-dark focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-ghost text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary text-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Application</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

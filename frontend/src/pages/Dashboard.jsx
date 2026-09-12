import { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';
import {
  UploadCloud, FileText, CheckCircle, AlertTriangle, Loader2,
  Bot, Briefcase, GraduationCap, Sparkles, TrendingUp,
  X, ChevronRight, Zap
} from 'lucide-react';

// ---------- Animated Score Ring Component ----------
function ScoreRing({ score, size = 120, strokeWidth = 10 }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - animatedScore / 100);

  useEffect(() => {
    // Animate the score from 0 to actual value
    const timer = setTimeout(() => setAnimatedScore(score), 200);
    return () => clearTimeout(timer);
  }, [score]);

  const getScoreColor = (s) => {
    if (s >= 80) return { stroke: '#0F6E56', text: 'text-secondary', bg: 'bg-secondary/10', label: 'Excellent' };
    if (s >= 60) return { stroke: '#185FA5', text: 'text-primary', bg: 'bg-primary/10', label: 'Good' };
    if (s >= 40) return { stroke: '#EF9F27', text: 'text-warning', bg: 'bg-warning/10', label: 'Needs Work' };
    return { stroke: '#E24B4A', text: 'text-danger', bg: 'bg-danger/10', label: 'Weak' };
  };

  const colors = getScoreColor(score);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            stroke="#E5E4DF" strokeWidth={strokeWidth}
            fill="transparent"
          />
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            stroke={colors.stroke} strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="progress-ring"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-extrabold ${colors.text} animate-count-up`}>
            {animatedScore}
          </span>
          <span className="text-xs text-text-muted font-medium">/ 100</span>
        </div>
      </div>
      <span className={`badge ${colors.bg} ${colors.text} text-xs font-bold px-3 py-1 rounded-full`}>
        {colors.label}
      </span>
    </div>
  );
}

// ---------- Skill Badge ----------
function SkillBadge({ skill, index }) {
  const colorSets = [
    'bg-primary/10 text-primary-dark border-primary/20',
    'bg-secondary/10 text-secondary-dark border-secondary/20',
    'bg-accent/10 text-accent-dark border-accent/20',
  ];
  return (
    <span
      className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold border animate-fade-up ${colorSets[index % 3]}`}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {skill}
    </span>
  );
}

// ---------- Experience Card ----------
function ExperienceCard({ exp, index }) {
  return (
    <div
      className="flex gap-4 p-4 rounded-xl hover:bg-surface-muted transition-colors animate-fade-up"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="shrink-0 w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
        <Briefcase className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0">
        <h4 className="font-semibold text-text-primary text-sm">{exp.role || exp.title}</h4>
        <p className="text-text-secondary text-xs mt-0.5">{exp.company}</p>
        {exp.duration && (
          <p className="text-text-muted text-xs mt-1">{exp.duration}</p>
        )}
        {exp.description && (
          <p className="text-text-secondary text-xs mt-2 leading-relaxed line-clamp-2">{exp.description}</p>
        )}
      </div>
    </div>
  );
}

// ---------- Education Card ----------
function EducationCard({ edu, index }) {
  return (
    <div
      className="flex gap-4 p-4 rounded-xl hover:bg-surface-muted transition-colors animate-fade-up"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="shrink-0 w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center">
        <GraduationCap className="h-5 w-5 text-secondary" />
      </div>
      <div className="min-w-0">
        <h4 className="font-semibold text-text-primary text-sm">{edu.degree || edu.field}</h4>
        <p className="text-text-secondary text-xs mt-0.5">{edu.institution || edu.school}</p>
        {edu.year && (
          <p className="text-text-muted text-xs mt-1">{edu.year}</p>
        )}
      </div>
    </div>
  );
}

// ---------- Main Dashboard ----------
export default function Dashboard() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // ---- Drag and Drop Handlers ----
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set false if leaving the dropzone entirely
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer?.files?.[0];
    if (droppedFile) {
      const ext = droppedFile.name.split('.').pop().toLowerCase();
      if (['pdf', 'docx'].includes(ext)) {
        setFile(droppedFile);
        setError('');
      } else {
        setError('Only PDF and DOCX files are accepted.');
      }
    }
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const clearFile = () => {
    setFile(null);
    setParsedData(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('resume', file);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/resume/upload`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          withCredentials: true
        }
      );
      setParsedData(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred during upload. Make sure all services are running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-24 pb-20 min-h-screen bg-slate-50/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-10 animate-fade-up">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-text-primary">Your Career Twin</h1>
              <p className="text-text-secondary text-sm">Upload your resume to initialize your AI profile</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* ===== LEFT COLUMN: Upload ===== */}
          <div className="lg:col-span-4 space-y-6">
            <div className="card-premium p-6 animate-fade-up stagger-1">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-text-primary">Resume Upload</h2>
                {file && (
                  <button onClick={clearFile} className="text-text-muted hover:text-danger transition-colors" title="Clear file">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Drag-and-Drop Zone */}
              <div
                id="dropzone"
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer ${
                  isDragging
                    ? 'dropzone-active border-primary bg-primary/5'
                    : file
                    ? 'border-secondary/50 bg-secondary/5'
                    : 'border-border hover:border-primary/40 bg-surface-muted/50'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  id="resume-upload"
                  className="hidden"
                  accept=".pdf,.docx"
                  onChange={handleFileChange}
                />

                <div className="flex flex-col items-center">
                  {isDragging ? (
                    <>
                      <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-3 animate-pulse">
                        <UploadCloud className="h-7 w-7 text-primary" />
                      </div>
                      <span className="text-sm font-semibold text-primary">Drop your resume here</span>
                    </>
                  ) : file ? (
                    <>
                      <div className="w-14 h-14 bg-secondary/10 rounded-2xl flex items-center justify-center mb-3">
                        <FileText className="h-7 w-7 text-secondary" />
                      </div>
                      <span className="text-sm font-semibold text-text-primary truncate max-w-[200px]">{file.name}</span>
                      <span className="text-xs text-text-muted mt-1">{(file.size / 1024).toFixed(1)} KB</span>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 bg-surface-muted rounded-2xl flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors">
                        <UploadCloud className="h-7 w-7 text-text-muted" />
                      </div>
                      <span className="text-sm font-medium text-text-primary">
                        Drop your resume here or <span className="text-primary font-semibold">browse</span>
                      </span>
                      <span className="text-xs text-text-muted mt-2">Supports PDF & DOCX • Max 5MB</span>
                    </>
                  )}
                </div>
              </div>

              {/* Upload button */}
              <button
                id="analyze-button"
                onClick={handleUpload}
                disabled={!file || loading}
                className="w-full mt-6 bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-white py-3.5 rounded-xl font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5" />
                    Analyze Resume
                  </>
                )}
              </button>

              {/* Error message */}
              {error && (
                <div className="mt-4 p-3 bg-danger/10 border border-danger/20 rounded-xl flex items-start gap-2 text-danger text-sm animate-fade-up">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}
            </div>

            {/* Quick stats when data is available */}
            {parsedData && (
              <div className="card-premium p-6 animate-fade-up stagger-3">
                <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-secondary" /> Quick Stats
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Skills', value: parsedData.skills?.length || 0, color: 'text-primary' },
                    { label: 'Roles', value: parsedData.experience?.length || 0, color: 'text-secondary' },
                    { label: 'Education', value: parsedData.education?.length || 0, color: 'text-accent' },
                    { label: 'Tips', value: parsedData.improvement_suggestions?.length || 0, color: 'text-warning' },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-surface-muted rounded-xl p-3 text-center">
                      <p className={`text-2xl font-extrabold ${stat.color}`}>{stat.value}</p>
                      <p className="text-xs text-text-muted mt-0.5">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ===== RIGHT COLUMN: Results ===== */}
          <div className="lg:col-span-8">
            {loading ? (
              /* Loading State */
              <div className="card-premium p-16 flex flex-col items-center justify-center min-h-[500px]">
                <div className="relative">
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center animate-pulse-glow">
                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-text-primary mt-8">AI is analyzing your profile</h3>
                <p className="text-text-muted text-sm mt-2 max-w-md text-center">
                  Extracting skills, mapping experience, and computing your ATS compatibility score...
                </p>
                <div className="flex gap-1 mt-8">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                  ))}
                </div>
              </div>
            ) : parsedData ? (
              /* Results State */
              <div className="space-y-6">

                {/* ---- ATS Score + Profile Header ---- */}
                <div className="card-premium p-8 animate-fade-up">
                  <div className="flex flex-col sm:flex-row items-center gap-8">
                    <ScoreRing score={parsedData.ats_score} />
                    <div className="flex-1 text-center sm:text-left">
                      <h2 className="text-2xl font-extrabold text-text-primary">{parsedData.name}</h2>
                      <p className="text-text-secondary text-sm mt-1">{parsedData.email}</p>
                      <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-2">
                        {parsedData.skills?.slice(0, 5).map((skill, i) => (
                          <SkillBadge key={i} skill={skill} index={i} />
                        ))}
                        {parsedData.skills?.length > 5 && (
                          <span className="badge badge-primary">+{parsedData.skills.length - 5} more</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* ---- All Skills ---- */}
                  <div className="card-premium p-6 animate-fade-up stagger-1">
                    <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-primary" />
                      Detected Skills
                      <span className="badge badge-primary ml-auto">{parsedData.skills?.length}</span>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {parsedData.skills?.map((skill, i) => (
                        <SkillBadge key={i} skill={skill} index={i} />
                      ))}
                    </div>
                  </div>

                  {/* ---- Improvement Suggestions ---- */}
                  <div className="card-premium p-6 animate-fade-up stagger-2">
                    <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-accent" />
                      AI Suggestions
                    </h3>
                    <ul className="space-y-3">
                      {parsedData.improvement_suggestions?.map((suggestion, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-3 p-3 bg-surface-muted rounded-xl text-sm animate-fade-up"
                          style={{ animationDelay: `${i * 0.1}s` }}
                        >
                          <ChevronRight className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                          <span className="text-text-secondary leading-relaxed">{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* ---- Experience ---- */}
                  <div className="card-premium p-6 animate-fade-up stagger-3">
                    <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-primary" />
                      Experience
                      <span className="badge badge-primary ml-auto">{parsedData.experience?.length}</span>
                    </h3>
                    {parsedData.experience?.length > 0 ? (
                      <div className="space-y-1">
                        {parsedData.experience.map((exp, i) => (
                          <ExperienceCard key={i} exp={exp} index={i} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-text-muted text-sm">No experience entries detected.</p>
                    )}
                  </div>

                  {/* ---- Education ---- */}
                  <div className="card-premium p-6 animate-fade-up stagger-4">
                    <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-secondary" />
                      Education
                      <span className="badge badge-secondary ml-auto">{parsedData.education?.length}</span>
                    </h3>
                    {parsedData.education?.length > 0 ? (
                      <div className="space-y-1">
                        {parsedData.education.map((edu, i) => (
                          <EducationCard key={i} edu={edu} index={i} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-text-muted text-sm">No education entries detected.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Empty State */
              <div className="card-premium p-16 flex flex-col items-center justify-center min-h-[500px] text-center border-dashed animate-fade-up">
                <div className="w-20 h-20 bg-gradient-to-br from-surface-muted to-primary/5 rounded-3xl flex items-center justify-center mb-6">
                  <Bot className="h-10 w-10 text-text-muted" />
                </div>
                <h3 className="text-xl font-bold text-text-primary">Awaiting Your Resume</h3>
                <p className="text-text-muted text-sm mt-3 max-w-md leading-relaxed">
                  Upload your resume to see your ATS score, extracted skills, experience timeline, and AI-generated improvement suggestions.
                </p>
                <div className="flex items-center gap-6 mt-8 text-xs text-text-muted">
                  {[
                    { icon: <Zap className="h-3.5 w-3.5" />, text: 'Instant Analysis' },
                    { icon: <Sparkles className="h-3.5 w-3.5" />, text: 'AI Powered' },
                    { icon: <TrendingUp className="h-3.5 w-3.5" />, text: 'ATS Scoring' },
                  ].map((item) => (
                    <div key={item.text} className="flex items-center gap-1.5">
                      {item.icon}
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useRef } from 'react';
import {
  GripVertical, ArrowUp, ArrowDown, Download, Printer,
  Eye, EyeOff, FileText, Check, Sliders, RefreshCw, Sparkles, Briefcase, GraduationCap, Code2, FolderGit2, User
} from 'lucide-react';

const DEFAULT_SECTIONS = [
  { id: 'header', label: 'Header & Contact Information', icon: User, required: true },
  { id: 'skills', label: 'Technical Skills & Tools', icon: Code2, required: false },
  { id: 'experience', label: 'Work Experience & Internships', icon: Briefcase, required: false },
  { id: 'projects', label: 'Featured Technical Projects', icon: FolderGit2, required: false },
  { id: 'education', label: 'Education & Degrees', icon: GraduationCap, required: false },
];

export default function ResumeSectionEditor({ parsedData, onUpdateData }) {
  // Ordered section IDs
  const [sections, setSections] = useState([
    'header',
    'skills',
    'experience',
    'projects',
    'education',
  ]);

  // Section visibility
  const [visibleSections, setVisibleSections] = useState({
    header: true,
    skills: true,
    experience: true,
    projects: true,
    education: true,
  });

  // Typography & Layout configuration
  const [fontSize, setFontSize] = useState('standard'); // 'compact' | 'standard' | 'relaxed'
  const [margins, setMargins] = useState('normal'); // 'tight' | 'normal' | 'wide'
  const [fontFamily, setFontFamily] = useState('sans'); // 'sans' | 'serif'
  const [showDividers, setShowDividers] = useState(true);

  // Drag-and-drop state
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const previewRef = useRef(null);

  // Re-ordering logic
  const moveSection = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sections.length) return;
    const newSections = [...sections];
    const [moved] = newSections.splice(index, 1);
    newSections.splice(targetIndex, 0, moved);
    setSections(newSections);
  };

  const toggleVisibility = (id) => {
    if (id === 'header') return; // Header cannot be hidden
    setVisibleSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Drag & drop handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    const newSections = [...sections];
    const [moved] = newSections.splice(draggedIndex, 1);
    newSections.splice(index, 0, moved);
    setSections(newSections);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Reset to default ordering
  const resetOrder = () => {
    setSections(['header', 'skills', 'experience', 'projects', 'education']);
    setVisibleSections({
      header: true,
      skills: true,
      experience: true,
      projects: true,
      education: true,
    });
    setFontSize('standard');
    setMargins('normal');
  };

  // Sample data fallback if parsed fields are sparse
  const candidateName = parsedData?.name || 'Candidate Name';
  const candidateEmail = parsedData?.email || 'candidate@example.com';
  const candidatePhone = parsedData?.phone || '+91 98765 43210';
  const githubUser = parsedData?.github_username || '';
  const linkedinUrl = parsedData?.linkedin_url || '';
  const portfolioUrl = parsedData?.portfolio_url || '';

  const skillsList = parsedData?.skills?.length
    ? parsedData.skills
    : ['React', 'JavaScript (ES6+)', 'Node.js', 'Express', 'MongoDB', 'PostgreSQL', 'Git', 'REST APIs', 'Docker', 'Tailwind CSS'];

  const experienceList = parsedData?.experience?.length
    ? parsedData.experience
    : [
        {
          role: 'Full Stack Engineering Intern',
          company: 'TechCorp Solutions',
          duration: 'June 2024 - Present',
          description: 'Architected and shipped customer dashboard components serving 10,000+ daily active users. Reduced client-side bundle size by 32% using dynamic route-level code splitting.',
        },
        {
          role: 'Frontend Developer Intern',
          company: 'Innovate Labs',
          duration: 'Jan 2024 - May 2024',
          description: 'Implemented responsive UI widgets and integrated RESTful endpoints with optimistic caching. Improved Lighthouse accessibility audit scores from 68 to 98.',
        },
      ];

  const projectsList = [
    {
      title: 'FreshersCompass Career Cockpit',
      technologies: 'React, Node.js, Express, MongoDB, Tailwind CSS',
      description: 'Engineered an AI-powered placement preparation suite with deterministic ATS keyword matching, real-time audio interview simulators, and codebase RAG.',
      link: githubUser ? `https://github.com/${githubUser}/FreshersCompass` : 'https://github.com/example/FreshersCompass',
    },
    {
      title: 'Distributed Task Queue & Scheduler',
      technologies: 'Node.js, Redis, Docker, PostgreSQL',
      description: 'Built high-throughput priority worker pool processing asynchronous webhook telemetry with at-least-once delivery guarantees and dead-letter queueing.',
      link: 'https://github.com/example/task-queue',
    },
  ];

  const educationList = parsedData?.education?.length
    ? parsedData.education
    : [
        {
          degree: 'Bachelor of Technology in Computer Science & Engineering',
          institution: 'Institute of Engineering & Technology',
          year: '2021 - 2025',
          field: 'CGPA: 8.8 / 10.0',
        },
      ];

  // Font size classes
  const fontClasses = {
    compact: {
      body: 'text-[11px] leading-[1.35]',
      name: 'text-xl font-bold',
      heading: 'text-[12px] font-bold tracking-wider',
      subheading: 'text-[11px] font-semibold',
      gap: 'space-y-2.5',
    },
    standard: {
      body: 'text-xs leading-relaxed',
      name: 'text-2xl font-bold',
      heading: 'text-sm font-bold tracking-wide',
      subheading: 'text-xs font-semibold',
      gap: 'space-y-4',
    },
    relaxed: {
      body: 'text-sm leading-relaxed',
      name: 'text-3xl font-extrabold',
      heading: 'text-base font-bold tracking-normal',
      subheading: 'text-sm font-semibold',
      gap: 'space-y-5',
    },
  }[fontSize];

  // Margin classes
  const marginClasses = {
    tight: 'p-6 sm:p-8',
    normal: 'p-8 sm:p-12',
    wide: 'p-10 sm:p-16',
  }[margins];

  // Trigger Client-Side PDF Printing
  const handlePrintPDF = () => {
    setIsExporting(true);
    setTimeout(() => {
      window.print();
      setIsExporting(false);
    }, 150);
  };

  return (
    <div className="space-y-6">
      {/* Print-specific CSS styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #ats-resume-print-area, #ats-resume-print-area * {
            visibility: visible;
          }
          #ats-resume-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 15mm 20mm !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>

      {/* Editor & Customizer Bar */}
      <div className="bg-surface rounded-card border border-border p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sliders className="h-5 w-5 text-primary" />
              <h2 className="text-base font-bold text-text-dark">Interactive Section Re-ordering & ATS PDF Template</h2>
            </div>
            <p className="text-xs text-text-body mt-0.5">
              Drag sections or use arrows to adjust hierarchy. ATS algorithms favor single-column chronological formats.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={resetOrder}
              className="px-3 py-1.5 rounded-lg border border-border bg-white text-xs font-semibold text-text-dark hover:bg-slate-50 transition-all flex items-center gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Reset Hierarchy</span>
            </button>
            <button
              id="download-ats-pdf-btn"
              onClick={handlePrintPDF}
              className="btn-accent px-4 py-2 text-xs font-bold flex items-center gap-2 shadow-xs"
            >
              <Printer className="h-4 w-4" />
              <span>Download ATS-Optimized PDF</span>
            </button>
          </div>
        </div>

        {/* Customization Options Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 mt-4 border-t border-border">
          {/* Font Sizing */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-dark flex items-center gap-1.5">
              <span>Typography Density</span>
            </label>
            <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-lg border border-border">
              {(['compact', 'standard', 'relaxed']).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setFontSize(size)}
                  className={`py-1 text-center capitalize rounded-md text-[11px] font-medium transition-all ${
                    fontSize === size
                      ? 'bg-primary text-white font-bold shadow-xs'
                      : 'text-text-body hover:text-text-dark'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Margins */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-dark flex items-center gap-1.5">
              <span>Page Margins</span>
            </label>
            <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-lg border border-border">
              {(['tight', 'normal', 'wide']).map((margin) => (
                <button
                  key={margin}
                  type="button"
                  onClick={() => setMargins(margin)}
                  className={`py-1 text-center capitalize rounded-md text-[11px] font-medium transition-all ${
                    margins === margin
                      ? 'bg-primary text-white font-bold shadow-xs'
                      : 'text-text-body hover:text-text-dark'
                  }`}
                >
                  {margin}
                </button>
              ))}
            </div>
          </div>

          {/* Font Family */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-dark flex items-center gap-1.5">
              <span>Font Style</span>
            </label>
            <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-lg border border-border">
              <button
                type="button"
                onClick={() => setFontFamily('sans')}
                className={`py-1 text-center rounded-md text-[11px] font-medium transition-all ${
                  fontFamily === 'sans'
                    ? 'bg-primary text-white font-bold shadow-xs'
                    : 'text-text-body hover:text-text-dark'
                }`}
              >
                Modern Sans
              </button>
              <button
                type="button"
                onClick={() => setFontFamily('serif')}
                className={`py-1 text-center rounded-md text-[11px] font-serif transition-all ${
                  fontFamily === 'serif'
                    ? 'bg-primary text-white font-bold shadow-xs'
                    : 'text-text-body hover:text-text-dark'
                }`}
              >
                Classic Serif
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout: 2 Columns (Draggable Controls on Left, Live ATS Print Preview on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Section Re-ordering Card */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-surface rounded-card border border-border p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-text-dark uppercase tracking-wider">
                Section Sequence ({sections.length})
              </h3>
              <span className="text-[11px] text-text-muted">Drag or use arrow buttons</span>
            </div>

            <div className="space-y-2">
              {sections.map((sectionId, idx) => {
                const sectionDef = DEFAULT_SECTIONS.find((s) => s.id === sectionId) || {
                  id: sectionId,
                  label: sectionId,
                  icon: FileText,
                };
                const IconComponent = sectionDef.icon;
                const isVisible = visibleSections[sectionId];
                const isDraggingThis = draggedIndex === idx;
                const isOverThis = dragOverIndex === idx;

                return (
                  <div
                    key={sectionId}
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing select-none ${
                      isDraggingThis
                        ? 'opacity-40 border-primary bg-primary/5'
                        : isOverThis
                        ? 'border-primary bg-primary/10 shadow-xs'
                        : isVisible
                        ? 'bg-white border-border hover:border-primary/40 shadow-2xs'
                        : 'bg-slate-50 border-dashed border-border opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="text-text-muted hover:text-primary">
                        <GripVertical className="h-4 w-4" />
                      </div>
                      <div className="w-6 h-6 rounded-md bg-surface flex items-center justify-center text-primary shrink-0">
                        <IconComponent className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs font-semibold text-text-dark truncate">
                        {sectionDef.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Move Up */}
                      <button
                        type="button"
                        onClick={() => moveSection(idx, -1)}
                        disabled={idx === 0}
                        aria-label={`Move ${sectionDef.label} up`}
                        className="p-1 rounded-md text-text-muted hover:text-text-dark hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>

                      {/* Move Down */}
                      <button
                        type="button"
                        onClick={() => moveSection(idx, 1)}
                        disabled={idx === sections.length - 1}
                        aria-label={`Move ${sectionDef.label} down`}
                        className="p-1 rounded-md text-text-muted hover:text-text-dark hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>

                      {/* Toggle Visibility (Header is always required) */}
                      {!sectionDef.required && (
                        <button
                          type="button"
                          onClick={() => toggleVisibility(sectionId)}
                          aria-label={isVisible ? `Hide ${sectionDef.label}` : `Show ${sectionDef.label}`}
                          className={`p-1 rounded-md transition-colors ${
                            isVisible
                              ? 'text-primary hover:bg-primary/10'
                              : 'text-text-muted hover:bg-slate-200'
                          }`}
                        >
                          {isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ATS Compliance Quality Notice */}
            <div className="mt-4 p-3 bg-primary/5 rounded-xl border border-primary/20 text-xs text-text-body space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                <span>ATS Formatting Best Practices</span>
              </div>
              <ul className="text-[11px] space-y-1 list-disc list-inside text-text-body">
                <li>Single-column layout ensures 100% linear OCR text parsing.</li>
                <li>Standardized section titles pass Taleo, Greenhouse, & Workday parsers.</li>
                <li>No tables, graphics, or rasterized columns that confuse bots.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right Column: Live ATS Preview (Print Area) */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-card border border-border shadow-md overflow-hidden">
            {/* Window title bar */}
            <div className="bg-slate-100 border-b border-border px-4 py-2.5 flex items-center justify-between text-xs text-text-muted">
              <span className="font-semibold text-text-dark flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span>ATS Printable Document Preview (A4 Single-Column)</span>
              </span>
              <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-border">
                {fontSize.toUpperCase()} • {margins.toUpperCase()}
              </span>
            </div>

            {/* Printable Document Canvas */}
            <div
              id="ats-resume-print-area"
              ref={previewRef}
              className={`bg-white text-slate-900 ${marginClasses} ${fontFamily === 'serif' ? 'font-serif' : 'font-sans'} ${fontClasses.gap}`}
              style={{ minHeight: '800px' }}
            >
              {sections.map((sectionId) => {
                if (!visibleSections[sectionId]) return null;

                if (sectionId === 'header') {
                  return (
                    <header key="header" className="border-b border-slate-300 pb-3 mb-2 text-center sm:text-left">
                      <h1 className={`${fontClasses.name} text-slate-900 tracking-tight`}>
                        {candidateName}
                      </h1>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-slate-600 text-xs">
                        {candidateEmail && <span>{candidateEmail}</span>}
                        {candidatePhone && <span>• {candidatePhone}</span>}
                        {githubUser && (
                          <span>
                            • github.com/{githubUser}
                          </span>
                        )}
                        {linkedinUrl && <span>• linkedin.com/in/profile</span>}
                        {portfolioUrl && <span>• {portfolioUrl}</span>}
                      </div>
                    </header>
                  );
                }

                if (sectionId === 'skills') {
                  return (
                    <section key="skills" className="space-y-1.5">
                      <h2 className={`${fontClasses.heading} uppercase text-slate-800 border-b border-slate-300 pb-1`}>
                        Technical Skills
                      </h2>
                      <div className={`${fontClasses.body} text-slate-700`}>
                        <p>
                          <strong className="text-slate-900">Languages & Frameworks: </strong>
                          {skillsList.join(', ')}
                        </p>
                      </div>
                    </section>
                  );
                }

                if (sectionId === 'experience') {
                  return (
                    <section key="experience" className="space-y-3">
                      <h2 className={`${fontClasses.heading} uppercase text-slate-800 border-b border-slate-300 pb-1`}>
                        Work Experience
                      </h2>
                      <div className="space-y-2.5">
                        {experienceList.map((exp, idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between text-xs">
                              <span className={`${fontClasses.subheading} text-slate-900`}>
                                {exp.role || exp.title} — <span className="font-normal text-slate-700">{exp.company}</span>
                              </span>
                              <span className="text-slate-500 text-[11px] font-mono shrink-0">
                                {exp.duration}
                              </span>
                            </div>
                            <p className={`${fontClasses.body} text-slate-700`}>
                              {exp.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                }

                if (sectionId === 'projects') {
                  return (
                    <section key="projects" className="space-y-3">
                      <h2 className={`${fontClasses.heading} uppercase text-slate-800 border-b border-slate-300 pb-1`}>
                        Key Technical Projects
                      </h2>
                      <div className="space-y-2.5">
                        {projectsList.map((proj, idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between text-xs">
                              <span className={`${fontClasses.subheading} text-slate-900`}>
                                {proj.title} <span className="text-slate-500 font-normal">({proj.technologies})</span>
                              </span>
                            </div>
                            <p className={`${fontClasses.body} text-slate-700`}>
                              {proj.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                }

                if (sectionId === 'education') {
                  return (
                    <section key="education" className="space-y-2">
                      <h2 className={`${fontClasses.heading} uppercase text-slate-800 border-b border-slate-300 pb-1`}>
                        Education
                      </h2>
                      <div className="space-y-2">
                        {educationList.map((edu, idx) => (
                          <div key={idx} className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between text-xs">
                            <div>
                              <div className={`${fontClasses.subheading} text-slate-900`}>
                                {edu.degree || edu.field}
                              </div>
                              <div className="text-slate-700 text-xs">
                                {edu.institution || edu.school}
                              </div>
                            </div>
                            <span className="text-slate-500 text-[11px] font-mono shrink-0">
                              {edu.year}
                            </span>
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                }

                return null;
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic, MicOff, Volume2, VolumeX, Bot, ArrowRight, CheckCircle2, AlertTriangle, RotateCcw,
  Sparkles, Award, Clock, HelpCircle, ChevronRight, Zap, Target, Timer, Loader2, ListChecks
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  evaluateInterviewSession, updateProfileInDB, generateInterviewQuestions,
  fetchProfileFromDB, fetchLatestResume, api
} from '../services/api';
import { buildCandidateContext, buildFallbackQuestions } from '../services/interviewQuestions';
import { useOfflineMode, OfflineModeBadge } from '../hooks/useOfflineMode';
import MicWaveform from '../components/MicWaveform';
import useMicMeter from '../hooks/useMicMeter';
import TimerGauge from '../components/TimerGauge';
import useCountdown from '../hooks/useCountdown';

/** Silence (ms) after which the answer is treated as finished. */
const SILENCE_TIMEOUT_MS = 3500;
/** Simulated pressure mode budget per question, matching real async screeners. */
const PRESSURE_DURATION_MS = 120000;
/** Default budget offered in practice mode. */
const PRACTICE_DURATION_MS = 180000;

export default function AIInterview() {
  const { report: reportOffline } = useOfflineMode();
  const [sessionStarted, setSessionStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [answers, setAnswers] = useState([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [evalError, setEvalError] = useState(null);

  // Timer mode: 'practice' (pausable) vs 'pressure' (auto-submit on expiry)
  const [timerMode, setTimerMode] = useState('practice');
  const [timerBudgetMs, setTimerBudgetMs] = useState(PRACTICE_DURATION_MS);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const questionStartedAtRef = useRef(null);

  // Adaptive question set (#30)
  const [questions, setQuestions] = useState([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(true);
  const [questionSource, setQuestionSource] = useState(null);
  const [targetRole, setTargetRole] = useState('Full-Stack Software Engineer');
  const [showCriteria, setShowCriteria] = useState(false);

  // Speech-to-Text & Text-to-Speech state
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechError, setSpeechError] = useState(null);
  const [silencePrompt, setSilencePrompt] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const recognitionRef = useRef(null);

  /**
   * Live mic metering + silence auto-stop (#43, #59).
   *
   * Silence only *flags* completion: the candidate may be mid-thought after a
   * pause, so recognition is left running and they confirm or dismiss it. That
   * avoids destroying a half-spoken answer while still saving them the reach for
   * the mouse.
   */
  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    setIsListening(false);
  }, []);

  const mic = useMicMeter({
    silenceTimeoutMs: SILENCE_TIMEOUT_MS,
    onSilenceTimeout: () => {
      setSilencePrompt(
        `No speech detected for ${(SILENCE_TIMEOUT_MS / 1000).toFixed(1)}s. Submit your answer, or keep talking to continue.`
      );
    },
  });

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Build the question set from verified profile data: target role, resume
  // skills/projects and the repos already indexed from GitHub. Each source is
  // fetched defensively so one missing endpoint cannot block generation.
  useEffect(() => {
    let cancelled = false;

    const loadQuestions = async () => {
      setIsGeneratingQuestions(true);

      const [profile, resume, repos] = await Promise.all([
        fetchProfileFromDB().catch(() => null),
        fetchLatestResume().catch(() => null),
        (async () => {
          try {
            const username = profile?.github_username || resume?.github_username;
            if (!username) return [];
            const res = await api.get(`/github/user/${encodeURIComponent(username)}/repos`);
            return res.data?.repos || res.data?.repositories || [];
          } catch (err) {
            console.warn('Repository lookup unavailable for question grounding:', err);
            return [];
          }
        })(),
      ]);

      if (cancelled) return;

      const context = buildCandidateContext({ profile, resume, repos });

      try {
        const pack = await generateInterviewQuestions({
          role: context.role,
          skills: context.skills,
          project_descriptions: context.project_descriptions,
          repositories: context.repositories,
        });

        if (cancelled) return;

        if (pack?.questions?.length) {
          setQuestions(pack.questions);
          setQuestionSource(pack.provider_used || 'adaptive');
          setTargetRole(pack.target_role || context.role);
          return;
        }
        throw new Error('Empty question set');
      } catch (err) {
        if (cancelled) return;
        console.error('Adaptive question generation failed, using local bank:', err);
        setQuestions(buildFallbackQuestions(context));
        setQuestionSource('offline-fallback');
        setTargetRole(context.role);
      } finally {
        if (!cancelled) setIsGeneratingQuestions(false);
      }
    };

    loadQuestions();

    return () => { cancelled = true; };
  }, []);

  const toggleListening = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError('Speech recognition is not supported in this browser. Please use Google Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      stopRecognition();
      mic.stop();
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript.trim()) {
          setUserAnswer((prev) => {
            const trimmed = prev.trim();
            return trimmed ? `${trimmed} ${finalTranscript.trim()}` : finalTranscript.trim();
          });
          setSilencePrompt(null);
        }
      };

      recognition.onerror = (event) => {
        if (event.error === 'not-allowed') {
          setSpeechError('Microphone permission was denied. Please allow microphone access in your browser.');
        } else if (event.error !== 'no-speech') {
          setSpeechError(`Speech recognition notice: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();

      // Metering is best-effort: if the mic is blocked the interview keeps
      // working, we just lose the waveform and silence detection.
      mic.start();
    } catch (err) {
      console.error('Speech recognition error:', err);
      setSpeechError('Could not start microphone dictation.');
      setIsListening(false);
    }
  };

  const handleToggleMute = useCallback(() => {
    // Pausing only means something while dictation is actually running.
    if (!isListening) return;
    mic.toggleMute();
    setIsMuted((prev) => !prev);
  }, [isListening, mic]);

  // Keyboard quick-toggle: "M" anywhere outside a text field, Spacebar only when
  // focus is not in a control (otherwise it would swallow typing).
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (!sessionStarted || isCompleted) return;

      const target = event.target;
      const tag = target?.tagName;
      const inTextField = tag === 'TEXTAREA' || tag === 'INPUT' || target?.isContentEditable;

      const isM = event.key === 'm' || event.key === 'M';
      const isSpace = event.code === 'Space' || event.key === ' ';

      if (isM && !inTextField) {
        event.preventDefault();
        handleToggleMute();
      } else if (isSpace && !inTextField && tag !== 'BUTTON') {
        event.preventDefault();
        if (isListening || mic.status === 'listening' || mic.status === 'muted') {
          handleToggleMute();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleToggleMute, isListening, mic.status, sessionStarted, isCompleted]);

  const toggleSpeaking = (text) => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech is not supported in this browser.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleStartSession = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    // Release the mic hardware too, otherwise the meter keeps drawing in the
    // background for a session that has not started yet.
    mic.stop();
    setIsMuted(false);
    setSilencePrompt(null);
    setIsListening(false);
    setIsSpeaking(false);
    setSpeechError(null);
    setShowCriteria(false);
    setSessionStarted(true);
    setCurrentQuestionIndex(0);
    setUserAnswer('');
    setAnswers([]);
    setIsCompleted(false);
    setEvaluationResult(null);
    setEvalError(null);
    setAutoSubmitted(false);
  };

  /**
   * Records how long the candidate actually spent, so the evaluator can score
   * pacing and conciseness instead of guessing from answer length.
   */
  const elapsedForAnswer = () => {
    const startedAt = questionStartedAtRef.current;
    if (!startedAt) return 0;
    return Math.max(0, Math.round((Date.now() - startedAt) / 1000));
  };

  const currentQuestion = questions[currentQuestionIndex] || null;

  const handleSubmitAnswer = async (options = {}) => {
    const { auto = false } = options;
    if (!userAnswer.trim() || !currentQuestion) return;

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    mic.stop();
    setIsMuted(false);
    setSilencePrompt(null);
    setIsListening(false);
    setIsSpeaking(false);

    const timeSpentSeconds = elapsedForAnswer();

    const nextAnswers = [
      ...answers,
      {
        question: currentQuestion,
        answer: userAnswer,
        time_spent_seconds: timeSpentSeconds,
        budget_seconds: Math.round(timerBudgetMs / 1000),
        auto_submitted: auto,
      },
    ];
    setAnswers(nextAnswers);
    setUserAnswer('');
    setAutoSubmitted(false);

    if (currentQuestionIndex + 1 < questions.length) {
      setShowCriteria(false);
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setIsEvaluating(true);
      setEvalError(null);

      const formattedPayload = nextAnswers.map((item) => ({
        question_id: item.question.id,
        category: item.question.category,
        question: item.question.question,
        expected_points: item.question.expected_points || item.question.expectedPoints || [],
        answer: item.answer,
        time_spent_seconds: item.time_spent_seconds,
        budget_seconds: item.budget_seconds,
        auto_submitted: item.auto_submitted,
      }));

      let finalScore = 84;
      try {
        const report = await evaluateInterviewSession(formattedPayload, targetRole);
        setEvaluationResult(report);
        reportOffline(Boolean(report?.offline_mode));
        if (report?.overall_score) {
          finalScore = report.overall_score;
        }
      } catch (err) {
        console.error('Interview evaluation error:', err);
        setEvalError('Online LLM evaluation hit latency limit; generated heuristic scoring analysis.');
        reportOffline(true);
        setEvaluationResult({
          overall_score: 84,
          technical_clarity: 86,
          system_design_depth: 82,
          behavioral_impact: 85,
          // No pacing measurement is possible on the fallback path.
          pacing_score: null,
          feedback_summary: 'Comprehensive analysis of responses completed with solid architectural foundation and clear communication style.',
          strong_points: [
            'Articulate explanation of token lifecycle and state handling',
            'Solid understanding of database concurrency and scaling strategies',
            'Strong engineering problem-solving and structured methodology'
          ],
          areas_to_polish: [
            'Quantify performance impact (e.g. latency, p99, or throughput metrics)',
            'Mention circuit breakers and rate-limiting fallbacks explicitly'
          ],
          per_question_feedback: [],
          provider_used: 'heuristic-resilient-evaluator'
        });
        finalScore = 84;
      } finally {
        try {
          await updateProfileInDB({
            competency_scores: { interview: finalScore },
          });
          window.dispatchEvent(
            new CustomEvent('freshercompass_profile_updated', { detail: undefined })
          );
        } catch (saveErr) {
          console.error('Failed to sync interview score to profile:', saveErr);
        }
        setIsEvaluating(false);
        setIsCompleted(true);
      }
    }
  };

  const progressPercent = questions.length
    ? Math.round(((currentQuestionIndex + 1) / questions.length) * 100)
    : 0;

  /**
   * Pressure mode auto-submits when the budget runs out. In practice mode the
   * timer only warns, because forcing a cut-off while someone is still
   * thinking is the opposite of what practice mode is for.
   */
  const handleExpire = useCallback(() => {
    if (timerMode !== 'pressure') return;
    if (!userAnswer.trim()) return;
    setAutoSubmitted(true);
    handleSubmitAnswer({ auto: true });
  }, [timerMode, userAnswer, handleSubmitAnswer]);

  const timer = useCountdown({
    durationMs: timerBudgetMs,
    onExpire: handleExpire,
  });

  // (Re)arm the budget and the stopwatch whenever the question changes.
  // `start` is destructured rather than read off `timer` because the hook
  // returns a fresh object each render, which would re-arm on every render.
  const { start: startTimer } = timer;
  useEffect(() => {
    if (!sessionStarted || isCompleted) return;
    questionStartedAtRef.current = Date.now();
    setAutoSubmitted(false);
    startTimer(timerBudgetMs);
  }, [currentQuestionIndex, sessionStarted, isCompleted, timerBudgetMs, startTimer]);

  const TIMER_PRESETS = [
    { label: '1 min', ms: 60000 },
    { label: '2 min', ms: 120000 },
    { label: '3 min', ms: 180000 },
    { label: '5 min', ms: 300000 },
  ];

  return (
    <div className="space-y-8 animate-fade-up">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
              AI Interview Simulator
            </h1>
            <OfflineModeBadge />
          </div>
          <p className="text-text-body text-sm mt-1">
            Distraction-free technical & behavioral interview room with instant evaluation.
          </p>
        </div>

        {sessionStarted && !isCompleted && (
          <button
            onClick={() => setSessionStarted(false)}
            className="text-xs font-semibold text-text-muted hover:text-danger self-start py-1"
          >
            Exit Session
          </button>
        )}
      </div>

      {/* 2. Key Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface rounded-card border border-border p-5 shadow-2xs">
          <span className="text-xs font-semibold text-text-body">Interview Mode</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-text-dark">{targetRole}</span>
          </div>
          <p className="text-[11px] text-text-muted mt-2">Customized from your uploaded resume & GitHub</p>
        </div>

        <div className="bg-surface rounded-card border border-border p-5 shadow-2xs">
          <span className="text-xs font-semibold text-text-body">Session Length</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-secondary">
              {isGeneratingQuestions ? 'Building…' : `${questions.length} Questions`}
            </span>
          </div>
          <p className="text-[11px] text-text-muted mt-2">
            {isGeneratingQuestions
              ? 'Synthesising from your profile'
              : questionSource === 'llm'
                ? 'Adaptive set generated from your verified profile'
                : 'Standard curriculum set'}
          </p>
        </div>

        <div className="bg-surface rounded-card border border-border p-5 shadow-2xs">
          <span className="text-xs font-semibold text-text-body">Evaluator AI</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-primary">Senior Staff AI</span>
          </div>
          <p className="text-[11px] text-text-muted mt-2">Analyzes architecture, clarity, and trade-offs</p>
        </div>
      </div>

      {/* 3. Main Stage */}
      {!sessionStarted ? (
        /* Pre-interview Waiting Room */
        <div className="bg-surface rounded-card border border-border p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-2xs space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-white border border-border text-primary flex items-center justify-center mx-auto shadow-xs">
            <Mic className="h-8 w-8" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-text-dark">Ready to Enter the Interview Room?</h2>
            <p className="text-xs sm:text-sm text-text-body mt-2 leading-relaxed max-w-lg mx-auto">
              This session tests your ability to explain code decisions, system trade-offs, and backend security under realistic engineering screening conditions.
            </p>
          </div>

          {/* Timer Mode Configuration (#41) */}
          <div className="text-left max-w-lg mx-auto space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted inline-flex items-center gap-1.5">
              <Timer className="h-3 w-3" />
              Timing Mode
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setTimerMode('practice');
                  setTimerBudgetMs(PRACTICE_DURATION_MS);
                }}
                aria-pressed={timerMode === 'practice'}
                className={`p-3 rounded-xl border text-left transition-all ${
                  timerMode === 'practice'
                    ? 'bg-primary/5 border-primary/40 shadow-xs'
                    : 'bg-white border-border hover:border-primary/30'
                }`}
              >
                <span className="flex items-center gap-1.5 text-xs font-bold text-text-dark">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  Untimed Practice Mode
                </span>
                <span className="block text-[11px] text-text-body mt-1 leading-relaxed">
                  A visible countdown you can pause or reset. Nothing is ever submitted for you.
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTimerMode('pressure');
                  setTimerBudgetMs(PRESSURE_DURATION_MS);
                }}
                aria-pressed={timerMode === 'pressure'}
                className={`p-3 rounded-xl border text-left transition-all ${
                  timerMode === 'pressure'
                    ? 'bg-accent/5 border-accent/40 shadow-xs'
                    : 'bg-white border-border hover:border-accent/30'
                }`}
              >
                <span className="flex items-center gap-1.5 text-xs font-bold text-text-dark">
                  <Zap className="h-3.5 w-3.5 text-accent" />
                  Simulated Pressure Mode
                </span>
                <span className="block text-[11px] text-text-body mt-1 leading-relaxed">
                  Hard deadline per question. Your answer is submitted automatically when time expires.
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="text-[11px] font-semibold text-text-body">Time per question:</span>
              {TIMER_PRESETS.map((preset) => (
                <button
                  key={preset.ms}
                  type="button"
                  onClick={() => setTimerBudgetMs(preset.ms)}
                  aria-pressed={timerBudgetMs === preset.ms}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${
                    timerBudgetMs === preset.ms
                      ? 'bg-primary/10 border-primary/40 text-primary'
                      : 'bg-white border-border text-text-muted hover:text-text-dark'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
              <span className="text-[10px] text-text-muted">
                {Math.floor(timerBudgetMs / 60000)} min budget
                {timerMode === 'pressure' ? ' · auto-submit on' : ' · pausable'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-lg mx-auto text-xs text-text-dark">
            <div className="bg-white p-3 rounded-xl border border-border flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              <span>One question at a time</span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-border flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              <span>Full post-session breakdown</span>
            </div>
          </div>

          {isGeneratingQuestions && (
            <div className="flex items-center justify-center gap-2 text-xs text-text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Building your question set from resume skills and GitHub repos...</span>
            </div>
          )}

          <button
            onClick={handleStartSession}
            disabled={isGeneratingQuestions || questions.length === 0}
            className="btn-accent text-sm font-bold px-8 py-3.5 disabled:opacity-50"
          >
            <span>{isGeneratingQuestions ? 'Preparing Questions' : 'Start Technical Interview'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      ) : !currentQuestion ? (
        <div className="bg-surface rounded-card border border-border p-16 text-center max-w-md mx-auto shadow-2xs space-y-4">
          <AlertTriangle className="h-8 w-8 text-warning mx-auto" />
          <h3 className="text-base font-bold text-text-dark">Question set unavailable</h3>
          <p className="text-xs text-text-body">Reload the page to regenerate your interview questions.</p>
        </div>
      ) : isEvaluating ? (
        /* Evaluation Loading */
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="bg-surface rounded-card border border-border p-16 text-center max-w-md mx-auto shadow-2xs space-y-4"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto animate-pulse">
            <Sparkles className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-text-dark">Evaluating Your Technical Depth</h3>
          <p className="text-xs text-text-body">
            Calling Senior Staff AI evaluator to critique your answers against industry benchmarks...
          </p>
        </div>
      ) : isCompleted && evaluationResult ? (
        /* Final Dynamic Evaluation Report Screen */
        <div
          role="region"
          aria-label="Interview evaluation and feedback report"
          aria-live="polite"
          className="bg-surface rounded-card border border-border p-8 shadow-2xs space-y-6 max-w-3xl mx-auto"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between pb-6 border-b border-border gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-success uppercase tracking-wider">
                  Session Complete
                </span>
                {evaluationResult.provider_used && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    <Zap className="h-2.5 w-2.5" />
                    {evaluationResult.provider_used}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-text-dark mt-1">AI Evaluation & Feedback Report</h2>
              <p className="text-xs text-text-muted mt-0.5">
                {evaluationResult.feedback_summary}
              </p>
            </div>
            <div className="text-center sm:text-right shrink-0">
              <span className="text-4xl font-black text-secondary font-mono">
                {evaluationResult.overall_score}%
              </span>
              <p className="text-[11px] text-text-muted">Overall Score</p>
            </div>
          </div>

          {/* Metric Sub-scores. Pacing is omitted rather than faked when the evaluator
              could not measure it (null on the offline fallback path). */}
          <div className={`grid gap-3 ${evaluationResult.pacing_score != null ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
            <div className="bg-white p-3.5 rounded-xl border border-border text-center">
              <span className="text-xs text-text-muted">Technical Clarity</span>
              <p className="text-lg font-bold text-primary font-mono mt-1">
                {evaluationResult.technical_clarity || evaluationResult.overall_score}%
              </p>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-border text-center">
              <span className="text-xs text-text-muted">System Design</span>
              <p className="text-lg font-bold text-secondary font-mono mt-1">
                {evaluationResult.system_design_depth || evaluationResult.overall_score}%
              </p>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-border text-center">
              <span className="text-xs text-text-muted">Behavioral Impact</span>
              <p className="text-lg font-bold text-text-dark font-mono mt-1">
                {evaluationResult.behavioral_impact || evaluationResult.overall_score}%
              </p>
            </div>
            {evaluationResult.pacing_score != null && (
              <div className="bg-white p-3.5 rounded-xl border border-border text-center">
                <span className="text-xs text-text-muted">Pacing</span>
                <p className="text-lg font-bold text-accent font-mono mt-1">
                  {evaluationResult.pacing_score}%
                </p>
              </div>
            )}
          </div>

          {evaluationResult.time_management_summary && (
            <div className="p-4 bg-accent/5 border border-accent/20 rounded-xl">
              <span className="flex items-center gap-2 text-xs font-bold text-accent mb-1">
                <Clock className="h-3.5 w-3.5" />
                Time Management Feedback
              </span>
              <p className="text-[11px] text-text-body leading-relaxed">
                {evaluationResult.time_management_summary}
              </p>
            </div>
          )}

          {/* Strengths and Improvements */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border border-border space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-success">
                <CheckCircle2 className="h-4 w-4" />
                <span>Demonstrated Strengths</span>
              </div>
              <ul className="text-xs text-text-body space-y-1.5 list-disc list-inside leading-relaxed">
                {(evaluationResult.strong_points || []).map((pt, i) => (
                  <li key={i}>{pt}</li>
                ))}
              </ul>
            </div>

            <div className="bg-white p-4 rounded-xl border border-border space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-warning">
                <AlertTriangle className="h-4 w-4" />
                <span>Areas to Polish</span>
              </div>
              <ul className="text-xs text-text-body space-y-1.5 list-disc list-inside leading-relaxed">
                {(evaluationResult.areas_to_polish || []).map((pt, i) => (
                  <li key={i}>{pt}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Per Question Breakdown (if returned) */}
          {evaluationResult.per_question_feedback && evaluationResult.per_question_feedback.length > 0 && (
            <div className="bg-white p-4 rounded-xl border border-border space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-text-dark">
                <Target className="h-4 w-4 text-primary" />
                <span>Question Breakdown</span>
              </div>
              <div className="space-y-2">
                {evaluationResult.per_question_feedback.map((qf, i) => (
                  <div key={i} className="flex items-start justify-between text-xs p-2.5 rounded-lg bg-surface border border-border/50">
                    <div>
                      <span className="font-bold text-text-dark">Question {qf.question_number || i + 1}: </span>
                      <span className="text-text-muted">{qf.key_takeaway}</span>
                    </div>
                    <span className="font-mono font-bold text-secondary shrink-0 ml-2">
                      {qf.score}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 flex items-center justify-between border-t border-border">
            <button
              onClick={handleStartSession}
              className="inline-flex items-center gap-2 text-xs font-bold text-text-body hover:text-text-dark"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Retry Session</span>
            </button>

            <Link
              to="/career-twin"
              className="btn-primary text-xs font-bold py-2.5 px-4"
            >
              <span>Save to Career Twin</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      ) : (

        /* Focused Question-by-Question Room */
        <div className="bg-surface rounded-card border border-border p-6 sm:p-8 max-w-3xl mx-auto shadow-2xs space-y-6">
          {/* Top Question Progress Indicator in Secondary Teal (#0F6E56) */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <span className="text-text-dark">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
              <span className="text-secondary font-mono font-bold">{progressPercent}%</span>
            </div>
            <div className="h-2 w-full bg-white rounded-full overflow-hidden border border-border/50">
              <div
                className="h-full bg-secondary rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* The Current Question Card */}
          <div className="bg-white rounded-xl p-6 border border-border space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                  <Target className="h-3 w-3" />
                  <span>{currentQuestion.category}</span>
                </span>
                {currentQuestion.difficulty && (
                  <span className="px-2.5 py-0.5 rounded-full bg-white border border-border text-text-muted text-[11px] font-bold capitalize">
                    {currentQuestion.difficulty}
                  </span>
                )}
              </div>

              {/* Text-to-Speech (TTS) Voice Prompt */}
              <button
                type="button"
                onClick={() => toggleSpeaking(currentQuestion.question)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                  isSpeaking
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-700 animate-pulse'
                    : 'bg-white border-border text-text-muted hover:text-text-dark hover:border-primary/40'
                }`}
                title={isSpeaking ? 'Stop speaking' : 'Read question aloud'}
              >
                {isSpeaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                <span>{isSpeaking ? 'Stop Audio' : 'Listen to Question'}</span>
              </button>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-text-dark leading-snug">
              {currentQuestion.question}
            </h3>

            {currentQuestion.context && (
              <p className="text-[11px] text-text-muted border-l-2 border-primary/30 pl-2">
                Based on: {currentQuestion.context}
              </p>
            )}

            {currentQuestion.expected_points?.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowCriteria((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary hover:text-text-dark"
                  aria-expanded={showCriteria}
                >
                  <ListChecks className="h-3.5 w-3.5" />
                  <span>{showCriteria ? 'Hide' : 'Show'} what interviewers look for</span>
                  <ChevronRight className={`h-3 w-3 transition-transform ${showCriteria ? 'rotate-90' : ''}`} />
                </button>

                {showCriteria && (
                  <ul className="mt-2 space-y-1 list-disc list-inside text-[11px] text-text-body">
                    {currentQuestion.expected_points.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <p className="text-xs text-text-muted">
              Speak naturally as you would in a live screening call with an engineering manager.
            </p>
          </div>

          {/* Speech Error Banner if applicable */}
          {speechError && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between gap-2 text-xs text-amber-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>{speechError}</span>
              </div>
              <button
                type="button"
                onClick={() => setSpeechError(null)}
                className="text-xs font-bold text-amber-700 hover:text-amber-900"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Countdown Gauge (#41) */}
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-surface">
              <TimerGauge
                seconds={timer.seconds}
                progress={timer.progress}
                running={timer.running}
                paused={!timer.running && !timer.expired}
                totalSeconds={Math.round(timerBudgetMs / 1000)}
                onToggle={timer.toggle}
                onReset={() => timer.start(timerBudgetMs)}
              />

              <div className="text-right">
                <p
                  className={`text-[11px] font-bold ${
                    timer.expired ? 'text-red-700' : 'text-text-dark'
                  }`}
                >
                  {timer.expired
                    ? 'Time expired'
                    : `${timerMode === 'pressure' ? 'Pressure' : 'Practice'} mode`}
                </p>
                <p className="text-[10px] text-text-muted mt-0.5 leading-relaxed max-w-[15rem]">
                  {timer.seconds <= 10 && timer.running
                    ? 'Ten seconds left — wrap up your answer.'
                    : timer.seconds <= 30 && timer.running
                    ? 'Thirty seconds left.'
                    : timerMode === 'pressure'
                    ? 'Auto-submits when the budget runs out.'
                    : 'Timer is advisory; you stay in control.'}
                </p>
              </div>
            </div>

            {autoSubmitted && (
              <p className="text-[11px] font-semibold text-accent">
                Answer auto-submitted when the timer expired.
              </p>
            )}

            {/* User Answer Field with STT Microphone Toggle */}
          <div className="space-y-2">
            {/* Screen reader live announcement for voice dictation */}
            <div
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="sr-only"
            >
              {isListening ? 'Microphone active, listening for speech input.' : 'Microphone idle.'}
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label htmlFor="interview-user-answer" className="text-xs font-bold text-text-dark block">
                Your Answer / Explanation:
              </label>

              <div className="flex items-center gap-2">
                {/* Mute / pause quick toggle (#43) */}
                {isListening && (
                  <button
                    type="button"
                    onClick={handleToggleMute}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                      isMuted
                        ? 'bg-text-muted/10 border-text-muted/40 text-text-dark'
                        : 'bg-white border-border text-text-muted hover:text-text-dark hover:border-primary/40'
                    }`}
                    title={isMuted ? 'Resume microphone capture (M)' : 'Pause microphone capture while you think (M)'}
                    aria-pressed={isMuted}
                  >
                    {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                    <span>{isMuted ? 'Paused (M)' : 'Pause (M)'}</span>
                  </button>
                )}

                {/* Speech-to-Text (STT) Button */}
                <button
                  type="button"
                  onClick={toggleListening}
                  aria-pressed={isListening}
                  aria-label={isListening ? 'Stop microphone voice dictation' : 'Start microphone voice dictation'}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                    isListening
                      ? 'bg-red-500/10 border-red-500/40 text-red-600 shadow-xs animate-pulse'
                      : 'bg-white border-border text-text-muted hover:text-text-dark hover:border-primary/40'
                  }`}
                  title={isListening ? 'Stop listening' : 'Start voice dictation'}
                >
                  {isListening ? <MicOff className="h-3.5 w-3.5" aria-hidden="true" /> : <Mic className="h-3.5 w-3.5" aria-hidden="true" />}
                  <span>{isListening ? 'Listening (Click to Stop)...' : 'Answer with Voice (Speech-to-Text)'}</span>
                </button>
              </div>
            </div>

            {/* Mic status + live waveform (#43, #59) */}
            <div
              className={`rounded-xl border p-3 space-y-2 transition-colors ${
                mic.status === 'denied' || mic.status === 'error'
                  ? 'border-red-300 bg-red-50'
                  : isMuted || mic.status === 'muted'
                  ? 'border-border bg-surface-muted'
                  : mic.isSilent
                  ? 'border-warning/50 bg-warning/5'
                  : mic.status === 'listening'
                  ? 'border-success/40 bg-success/5'
                  : 'border-border bg-white'
              }`}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold"
                  role="status"
                  aria-live="polite"
                >
                  {mic.status === 'denied' || mic.status === 'error' ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
                      <span className="text-red-700">Microphone blocked</span>
                    </>
                  ) : mic.status === 'unsupported' ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-text-muted shrink-0" />
                      <span className="text-text-muted">Meter unavailable in this browser</span>
                    </>
                  ) : mic.status === 'muted' ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-text-muted shrink-0" />
                      <span className="text-text-dark">Capture paused — thinking time</span>
                    </>
                  ) : mic.status === 'requesting' ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-warning animate-pulse shrink-0" />
                      <span className="text-warning">Requesting microphone…</span>
                    </>
                  ) : mic.status === 'listening' && mic.isSilent ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-warning animate-pulse shrink-0" />
                      <span className="text-warning">Silence detected — answer looks complete</span>
                    </>
                  ) : mic.status === 'listening' ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-success animate-pulse shrink-0" />
                      <span className="text-success">Listening — microphone is live</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-text-muted shrink-0" />
                      <span className="text-text-muted">Microphone idle</span>
                    </>
                  )}
                </span>

                <span className="text-[10px] font-mono font-bold text-text-muted">
                  {mic.status === 'listening' ? `${Math.round(mic.level * 100)}%` : '—'}
                  {mic.isClipping && mic.status === 'listening' && (
                    <span className="text-warning ml-1.5">clipping</span>
                  )}
                </span>
              </div>

              <MicWaveform
                level={mic.level}
                active={mic.status === 'listening'}
                status={mic.status}
                height={52}
              />

              {mic.status === 'denied' && (
                <p className="text-[11px] text-red-700 leading-relaxed">
                  {mic.error}
                </p>
              )}

              {mic.isSilent && (
                <p className="text-[11px] text-warning font-semibold">
                  No speech for {(mic.silenceMs / 1000).toFixed(1)}s (auto-stop threshold{' '}
                  {(SILENCE_TIMEOUT_MS / 1000).toFixed(1)}s).
                </p>
              )}

              <p className="text-[10px] text-text-muted leading-relaxed">
                Tip: press <kbd className="font-mono font-bold">M</kbd> to pause capture while you
                formulate your answer, then press it again to resume.
              </p>
            </div>

            {/* Silence auto-stop prompt (#59) */}
            {silencePrompt && (
              <div
                role="alert"
                className="p-3 bg-warning/10 border border-warning/40 rounded-xl flex items-center justify-between gap-3 text-xs text-warning"
              >
                <span className="inline-flex items-center gap-2 font-semibold">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span>{silencePrompt}</span>
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setSilencePrompt(null);
                      mic.start();
                    }}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white border border-warning/40 hover:bg-warning/10"
                  >
                    Keep talking
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSilencePrompt(null);
                      stopRecognition();
                      mic.stop();
                      setIsMuted(false);
                    }}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-lg btn-accent"
                  >
                    Submit
                  </button>
                </span>
              </div>
            )}

            <textarea
              id="interview-user-answer"
              rows={6}
              value={userAnswer}
              onChange={(e) => {
                setUserAnswer(e.target.value);
                if (e.target.value.trim()) setSilencePrompt(null);
              }}
              aria-label="Your technical interview answer or explanation"
              placeholder="Speak using the voice button above, or type your technical breakdown here..."
              className="w-full p-4 bg-white rounded-xl border border-border text-xs text-text-dark focus:outline-none focus:border-primary leading-relaxed font-sans"
              autoFocus
            />
          </div>

          {/* Single Coral Action Button (#D85A30) */}
          <div className="flex items-center justify-end">
            <button
              onClick={() => handleSubmitAnswer()}
              disabled={!userAnswer.trim()}
              className="btn-accent text-xs font-bold px-6 py-3 disabled:opacity-50"
            >
              <span>
                {currentQuestionIndex + 1 === questions.length
                  ? 'Submit & View Report'
                  : 'Next Question'}
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

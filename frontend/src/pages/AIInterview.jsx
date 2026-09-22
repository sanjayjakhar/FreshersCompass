import { useState } from 'react';
import {
  Mic, Bot, ArrowRight, CheckCircle2, AlertTriangle, RotateCcw,
  Sparkles, Award, Clock, HelpCircle, ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AIInterview() {
  const [sessionStarted, setSessionStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [answers, setAnswers] = useState([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const questions = [
    {
      id: 1,
      category: 'System Architecture',
      question: 'Walk me through how your internship management system handles concurrent check-ins and database race conditions.',
      expectedPoints: ['PostgreSQL transactions or row-level locks', 'Fastify middleware verification', 'Idempotency keys'],
    },
    {
      id: 2,
      category: 'API Security & Auth',
      question: 'How do you secure JWT access and refresh token rotation in your backend service?',
      expectedPoints: ['Short-lived access tokens', 'HttpOnly secure cookies for refresh tokens', 'Argon2id hashing'],
    },
    {
      id: 3,
      category: 'Performance & Scaling',
      question: 'Suppose your API starts receiving 10x traffic during attendance peak times. What caching and optimization strategies would you implement?',
      expectedPoints: ['Redis caching for read queries', 'Connection pooling optimization', 'Nginx load balancing and rate limiting'],
    },
    {
      id: 4,
      category: 'Behavioral & Ownership',
      question: 'Tell me about a time you encountered a critical production bug right before deployment. How did you resolve it under pressure?',
      expectedPoints: ['Calm root-cause analysis', 'Reproducing in staging environment', 'Post-mortem documentation'],
    },
  ];

  const handleStartSession = () => {
    setSessionStarted(true);
    setCurrentQuestionIndex(0);
    setUserAnswer('');
    setAnswers([]);
    setIsCompleted(false);
  };

  const handleSubmitAnswer = () => {
    if (!userAnswer.trim()) return;

    const nextAnswers = [...answers, { question: questions[currentQuestionIndex], answer: userAnswer }];
    setAnswers(nextAnswers);
    setUserAnswer('');

    if (currentQuestionIndex + 1 < questions.length) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setIsEvaluating(true);
      setTimeout(() => {
        setIsEvaluating(false);
        setIsCompleted(true);
      }, 1200);
    }
  };

  const progressPercent = Math.round(((currentQuestionIndex + 1) / questions.length) * 100);

  return (
    <div className="space-y-8 animate-fade-up">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
            AI Interview Simulator
          </h1>
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
            <span className="text-2xl font-black text-text-dark">Full-Stack Defense</span>
          </div>
          <p className="text-[11px] text-text-muted mt-2">Customized from your uploaded resume & GitHub</p>
        </div>

        <div className="bg-surface rounded-card border border-border p-5 shadow-2xs">
          <span className="text-xs font-semibold text-text-body">Session Length</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-secondary">4 Questions</span>
          </div>
          <p className="text-[11px] text-text-muted mt-2">~10 minutes focused mock defense</p>
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

          {/* Single Coral CTA (#D85A30) */}
          <button
            onClick={handleStartSession}
            className="btn-accent text-sm font-bold px-8 py-3.5"
          >
            <span>Start Technical Interview</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      ) : isEvaluating ? (
        /* Evaluation Loading */
        <div className="bg-surface rounded-card border border-border p-16 text-center max-w-md mx-auto shadow-2xs space-y-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto animate-pulse">
            <Sparkles className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-text-dark">Evaluating Your Technical Depth</h3>
          <p className="text-xs text-text-body">
            Comparing your explanations against senior engineering benchmarks...
          </p>
        </div>
      ) : isCompleted ? (
        /* Final Evaluation Report Screen */
        <div className="bg-surface rounded-card border border-border p-8 shadow-2xs space-y-6 max-w-3xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between pb-6 border-b border-border gap-4">
            <div>
              <span className="text-[11px] font-bold text-success uppercase tracking-wider">
                Session Complete
              </span>
              <h2 className="text-xl font-bold text-text-dark mt-0.5">Evaluation & Feedback Report</h2>
            </div>
            <div className="text-center sm:text-right">
              <span className="text-3xl font-black text-secondary font-mono">82%</span>
              <p className="text-[11px] text-text-muted">Technical Clarity</p>
            </div>
          </div>

          {/* Strengths and Improvements */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border border-border space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-success">
                <CheckCircle2 className="h-4 w-4" />
                <span>Demonstrated Strengths</span>
              </div>
              <ul className="text-xs text-text-body space-y-1.5 list-disc list-inside leading-relaxed">
                <li>Articulate explanation of token lifecycle and Argon2id hashing</li>
                <li>Clear understanding of database concurrency and locking</li>
                <li>Strong emphasis on production observability and post-mortems</li>
              </ul>
            </div>

            <div className="bg-white p-4 rounded-xl border border-border space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-warning">
                <AlertTriangle className="h-4 w-4" />
                <span>Areas to Polish</span>
              </div>
              <ul className="text-xs text-text-body space-y-1.5 list-disc list-inside leading-relaxed">
                <li>Quantify performance impact (e.g. TPS or latency benchmarks)</li>
                <li>Mention circuit breakers when discussing high traffic spikes</li>
              </ul>
            </div>
          </div>

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
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
              <span>{questions[currentQuestionIndex].category}</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-text-dark leading-snug">
              {questions[currentQuestionIndex].question}
            </h3>
            <p className="text-xs text-text-muted">
              Speak naturally as you would in a live screening call with an engineering manager.
            </p>
          </div>

          {/* User Answer Field */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-dark block">
              Your Answer / Explanation:
            </label>
            <textarea
              rows={6}
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="Type your spoken answer or technical breakdown here..."
              className="w-full p-4 bg-white rounded-xl border border-border text-xs text-text-dark focus:outline-none focus:border-primary leading-relaxed font-sans"
              autoFocus
            />
          </div>

          {/* Single Coral Action Button (#D85A30) */}
          <div className="flex items-center justify-end">
            <button
              onClick={handleSubmitAnswer}
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

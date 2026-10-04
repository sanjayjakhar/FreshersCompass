/**
 * Candidate evidence gathering and offline fallback for adaptive questions (#30).
 *
 * The backend endpoint is the primary source. This module only exists so a
 * failed request still yields a role-aware interview instead of an empty room:
 * the app must never hard-depend on one AI call to be usable.
 */

const ROLE_HINTS = {
  frontend: ['React', 'component', 'render', 'bundle'],
  backend: ['API', 'transaction', 'index', 'queue'],
  fullstack: ['API', 'end-to-end', 'state', 'cache'],
  devops: ['pipeline', 'deployment', 'rollout', 'container'],
  'machine learning': ['model', 'dataset', 'inference', 'evaluation'],
};

const hintFor = (role) => {
  const lowered = (role || '').toLowerCase();
  const match = Object.keys(ROLE_HINTS).find((key) => lowered.includes(key));
  return match ? ROLE_HINTS[match] : ['architecture', 'trade-off', 'failure mode'];
};

/**
 * Flatten whatever the profile, resume and repo endpoints returned into the
 * payload the generator understands. Every field is optional; partial data is
 * fine because the service degrades to general-purpose questions.
 */
export const buildCandidateContext = ({ profile, resume, repos } = {}) => {
  const role =
    profile?.target_role ||
    resume?.experience?.[0]?.title ||
    'Full-Stack Software Engineer';

  const skills = [
    ...new Set(
      [
        ...(Array.isArray(resume?.skills) ? resume.skills : []),
        ...(profile?.project_tech ? profile.project_tech.split(/[,|/]/).map((s) => s.trim()) : []),
      ].filter(Boolean)
    ),
  ];

  const repositories = (Array.isArray(repos) ? repos : [])
    .filter((r) => r && (r.name || r.full_name))
    .slice(0, 8)
    .map((r) => ({
      name: r.name || r.full_name,
      language: r.language || '',
      description: r.description || '',
      topics: r.topics || [],
    }));

  const projectDescriptions = [
    profile?.project_description,
    ...(Array.isArray(resume?.experience) ? resume.experience.map((e) => e.description) : []),
    ...(Array.isArray(resume?.education) ? resume.education.map((e) => `${e.degree} ${e.field || ''}`.trim()) : []),
  ]
    .filter(Boolean)
    .map((d) => String(d).slice(0, 300))
    .slice(0, 6);

  return { role, skills, project_descriptions: projectDescriptions, repositories };
};

/**
 * Mirrors the service-side deterministic bank. Used only when the generate
 * endpoint is unreachable, so it stays deliberately short on context.
 */
export const buildFallbackQuestions = (context = {}) => {
  const role = context.role || 'Full-Stack Software Engineer';
  const skills = context.skills || [];
  const repos = context.repositories || [];
  const hints = hintFor(role);
  const primary = hints[0];

  const deepDives = repos.length
    ? [
        {
          id: 'fb-deep_dive-1',
          kind: 'deep_dive',
          category: 'Deep Dive on Your Work',
          question: `Walk me through the architecture of ${
            repos[0].name
          }${repos[0].language ? ` (${repos[0].language})` : ''}. What are the main modules, how do they communicate, and which decision would you reverse if you rebuilt it today?`,
          context: repos[0].description || '',
          expected_points: [
            'Clear module boundaries and data flow',
            'Explicit trade-off justification',
            'Acknowledges a real weakness or alternative',
          ],
          difficulty: 'hard',
        },
        {
          id: 'fb-deep_dive-2',
          kind: 'deep_dive',
          category: 'Deep Dive on Your Work',
          question: `In ${repos[0].name}, identify the single piece of logic you are least confident about. What test or instrumentation would prove whether it holds under load?`,
          context: '',
          expected_points: [
            'Names a specific file, function or path',
            'Proposes a concrete verification method',
            'Reports an honest result',
          ],
          difficulty: 'hard',
        },
      ]
    : [
        {
          id: 'fb-deep_dive-1',
          kind: 'deep_dive',
          category: 'Deep Dive on Your Work',
          question: `You list ${skills[0] || 'your primary stack'} on your resume. Describe a specific decision you made with it that a less experienced engineer would get wrong, and what it cost.`,
          context: '',
          expected_points: [
            'Concrete project context',
            'Names a trade-off, not just a benefit',
            'Quantifies impact where possible',
          ],
          difficulty: 'mid',
        },
        {
          id: 'fb-deep_dive-2',
          kind: 'deep_dive',
          category: 'Deep Dive on Your Work',
          question: 'Describe the most technically difficult bug you have shipped a fix for. How did you isolate it, and what proved the fix actually held?',
          context: '',
          expected_points: [
            'Systematic isolation, not guess-and-check',
            'Regression test or monitoring added',
            'Explains the root cause, not the symptom',
          ],
          difficulty: 'mid',
        },
      ];

  return [
    ...deepDives,
    {
      id: 'fb-domain-1',
      kind: 'domain',
      category: 'Domain Architecture & Debugging',
      question: `You are building a ${role} service that must absorb a 10x traffic spike during peak hours. Walk through your caching, database and ${primary} strategy in order of impact.`,
      context: '',
      expected_points: [
        'Layered caching with invalidation strategy',
        'Database indexing and connection limits',
        'Identifies the bottleneck before scaling',
      ],
      difficulty: 'mid',
    },
    {
      id: 'fb-domain-2',
      kind: 'domain',
      category: 'Domain Architecture & Debugging',
      question: `A production ${role} deployment degrades gradually rather than failing outright. Describe the first three things you check, in order, and how you rule each out.`,
      context: '',
      expected_points: [
        'Starts with metrics and recent changes',
        'Narrows by elimination with evidence',
        'Includes a rollback or mitigation path',
      ],
      difficulty: 'mid',
    },
    {
      id: 'fb-behavioral-1',
      kind: 'behavioral',
      category: 'Behavioral & Incident Response',
      question:
        'Tell me about a time you shipped something that broke in production. What did you do in the first hour, and what changed afterwards so it could not recur?',
      context: '',
      expected_points: [
        'Calm root-cause analysis before fixing',
        'Communication with stakeholders',
        'Concrete preventative change, not just a promise',
      ],
      difficulty: 'mid',
    },
  ];
};
import axios from "axios";

// In-memory cache for live jobs (refreshes every 10 minutes)
let jobsCache = {
  data: [],
  lastFetched: 0,
};

const CACHE_TTL_MS = 10 * 60 * 1000;

// Curated active India tech jobs and internships feed covering top Indian tech hubs & startups
const INDIA_TECH_JOBS_FEED = [
  {
    id: "in-1",
    title: "Software Engineering Intern (Summer 2026)",
    company: "Razorpay",
    location: "Bengaluru, India",
    remote: false,
    type: "Internship",
    grad_year: ["2026", "2027"],
    domain: "Full-Stack",
    url: "https://razorpay.com/jobs/",
    tags: ["React", "Node.js", "MySQL", "Docker", "REST APIs"],
    description: "Join Razorpay's payment infrastructure team as a software engineer intern. Build high-throughput checkout APIs and payment workflows for millions of merchants across India.",
    source: "India Tech Hubs",
    stipend_salary: "₹45,000 - ₹65,000 / month",
    posted_at: "Today",
  },
  {
    id: "in-2",
    title: "Associate Software Engineer — Backend (Fresher Batch 2024 / 2025)",
    company: "Swiggy",
    location: "Bengaluru / Hyderabad, India",
    remote: false,
    type: "Full Time",
    grad_year: ["2024", "2025"],
    domain: "Backend",
    url: "https://careers.swiggy.com/",
    tags: ["Java", "Python", "Go", "Distributed Systems", "MongoDB", "Backend"],
    description: "Work on Swiggy's logistics routing and real-time order dispatch engine. Perfect for graduates passionate about scalable distributed architectures and microservices.",
    source: "India Tech Hubs",
    stipend_salary: "14 - 18 LPA",
    posted_at: "Today",
  },
  {
    id: "in-3",
    title: "Frontend Developer Intern (React / Next.js)",
    company: "CRED",
    location: "Bengaluru, India",
    remote: false,
    type: "Internship",
    grad_year: ["2025", "2026"],
    domain: "Frontend",
    url: "https://cred.club/careers",
    tags: ["React.js", "Next.js", "Tailwind CSS", "TypeScript", "Redux", "Frontend"],
    description: "Build aesthetic, fluid UI experiences for CRED members. Strong attention to visual design, micro-animations, and frontend performance required.",
    source: "India Tech Hubs",
    stipend_salary: "₹50,000 / month",
    posted_at: "Yesterday",
  },
  {
    id: "in-4",
    title: "AI / Machine Learning Engineer (Graduate 2025/2026)",
    company: "Zomato",
    location: "Gurugram (Delhi NCR), India",
    remote: false,
    type: "Full Time",
    grad_year: ["2025", "2026"],
    domain: "AI/ML",
    url: "https://www.zomato.com/careers",
    tags: ["Python", "PyTorch", "NLP", "FastAPI", "RAG / LLMs"],
    description: "Develop generative AI customer assistants and recommendation ranking systems. Hands-on experience with LLMs and embeddings is highly valued.",
    source: "India Tech Hubs",
    stipend_salary: "16 - 22 LPA",
    posted_at: "2 days ago",
  },
  {
    id: "in-5",
    title: "Full-Stack Developer Intern (Remote India)",
    company: "Meesho",
    location: "Remote India",
    remote: true,
    type: "Internship",
    grad_year: ["2025", "2026", "2027"],
    domain: "Full-Stack",
    url: "https://meesho.io/careers",
    tags: ["React.js", "Node.js", "Express.js", "PostgreSQL", "AWS"],
    description: "Empower tier-2 and tier-3 Indian sellers with scalable e-commerce dashboards. Collaborate directly with senior engineers in an agile team.",
    source: "India Tech Hubs",
    stipend_salary: "₹40,000 / month",
    posted_at: "Today",
  },
  {
    id: "in-6",
    title: "Backend API Engineering Intern (Node.js / Express)",
    company: "Postman",
    location: "Bengaluru, India",
    remote: true,
    type: "Internship",
    grad_year: ["2025", "2026", "2027"],
    domain: "Backend",
    url: "https://www.postman.com/careers/",
    tags: ["Node.js", "JavaScript", "REST APIs", "Docker", "MongoDB", "Backend"],
    description: "Collaborate with the Postman public API platform team. Build resilient backend microservices and API gateways handling billions of developer requests.",
    source: "India Tech Hubs",
    stipend_salary: "₹55,000 / month",
    posted_at: "Today",
  },
  {
    id: "in-7",
    title: "Cloud & DevOps Intern (AWS / Kubernetes)",
    company: "PhonePe",
    location: "Bengaluru / Pune, India",
    remote: false,
    type: "Internship",
    grad_year: ["2025", "2026"],
    domain: "DevOps",
    url: "https://www.phonepe.com/careers/",
    tags: ["Docker", "Kubernetes", "Linux", "CI/CD", "AWS", "Terraform"],
    description: "Assist PhonePe's site reliability and platform teams maintaining infrastructure with 99.999% uptime processing billions of UPI transactions.",
    source: "India Tech Hubs",
    stipend_salary: "₹50,000 / month",
    posted_at: "Yesterday",
  },
  {
    id: "in-8",
    title: "Software Development Engineer 1 — Core Backend (Fresher 2024 / 2025)",
    company: "Flipkart",
    location: "Bengaluru, India",
    remote: false,
    type: "Full Time",
    grad_year: ["2024", "2025"],
    domain: "Backend",
    url: "https://www.flipkartcareers.com/",
    tags: ["Java", "Distributed Systems", "Kafka", "Redis", "DSA", "Backend"],
    description: "Core e-commerce catalog, pricing, and fulfillment platform engineering. High emphasis on data structures, algorithms, and modular design.",
    source: "India Tech Hubs",
    stipend_salary: "18 - 24 LPA",
    posted_at: "Today",
  },
  {
    id: "in-9",
    title: "Systems & Backend Developer (Go / Python) — Fresher",
    company: "Zerodha",
    location: "Bengaluru, India",
    remote: true,
    type: "Full Time",
    grad_year: ["2024", "2025", "2026"],
    domain: "Backend",
    url: "https://zerodha.tech/",
    tags: ["Go", "Python", "PostgreSQL", "Redis", "Linux", "Backend"],
    description: "Build ultra-low-latency financial market systems with Zerodha's core tech team. Clean idiomatic Go code, concurrency models, and open source ethos.",
    source: "India Tech Hubs",
    stipend_salary: "15 - 20 LPA",
    posted_at: "Just now",
  },
  {
    id: "in-10",
    title: "SDE-1 Backend (Python / Django / Fast-paced)",
    company: "Urban Company",
    location: "Gurugram / Bengaluru, India",
    remote: false,
    type: "Full Time",
    grad_year: ["2024", "2025"],
    domain: "Backend",
    url: "https://www.urbancompany.com/careers",
    tags: ["Python", "Django", "FastAPI", "PostgreSQL", "Kafka", "Backend"],
    description: "Design and implement high-availability microservices for Urban Company's global service fulfillment network spanning India, UAE, and Singapore.",
    source: "India Tech Hubs",
    stipend_salary: "16 - 21 LPA",
    posted_at: "Yesterday",
  },
  {
    id: "in-11",
    title: "Web Developer Intern (Early Stage Startup)",
    company: "BuildFast Labs",
    location: "Remote India",
    remote: true,
    type: "Internship",
    grad_year: ["2025", "2026", "2027"],
    domain: "Full-Stack",
    url: "https://angel.co",
    tags: ["React", "FastAPI", "MongoDB", "Tailwind CSS"],
    description: "Fast-paced YC-backed AI startup looking for an enthusiastic college intern to build customer-facing interactive web applications.",
    source: "India Startups",
    stipend_salary: "₹25,000 - ₹35,000 / month",
    posted_at: "Just now",
  },
  {
    id: "in-12",
    title: "Data Analyst & Python Intern",
    company: "Groww",
    location: "Bengaluru, India",
    remote: false,
    type: "Internship",
    grad_year: ["2025", "2026"],
    domain: "AI/ML",
    url: "https://groww.in/careers",
    tags: ["Python", "SQL", "Pandas", "Tableau", "Data Pipelines"],
    description: "Analyze user financial behavior and build automated reporting pipelines for India's leading investment platform.",
    source: "India Tech Hubs",
    stipend_salary: "₹35,000 / month",
    posted_at: "Yesterday",
  },
  {
    id: "in-13",
    title: "Graduate Software Engineer (TCS Digital / Prime)",
    company: "Tata Consultancy Services (TCS)",
    location: "Pune / Bengaluru / Hyderabad, India",
    remote: false,
    type: "Full Time",
    grad_year: ["2024", "2025"],
    domain: "Full-Stack",
    url: "https://www.tcs.com/careers",
    tags: ["Java", "Python", "SQL", "Spring Boot", "React.js"],
    description: "Digital cadence hiring for fresh engineering graduates. Work across enterprise cloud migration, modernization, and digital transformation.",
    source: "India Tech Hubs",
    stipend_salary: "7.5 - 9.2 LPA",
    posted_at: "3 days ago",
  },
  {
    id: "in-14",
    title: "Backend Engineer — Payments & Settlements",
    company: "Juspay",
    location: "Bengaluru, India",
    remote: false,
    type: "Full Time",
    grad_year: ["2024", "2025"],
    domain: "Backend",
    url: "https://juspay.in/careers",
    tags: ["Haskell", "Rust", "Java", "PostgreSQL", "Functional Programming", "Backend"],
    description: "Powering over 100 million daily transactions for India's largest merchants. Dive into highly resilient functional backend architectures.",
    source: "India Tech Hubs",
    stipend_salary: "15 - 22 LPA",
    posted_at: "Today",
  }
];

// Helper to intelligently classify domains based on title and tags
const detectJobDomain = (title = "", tags = []) => {
  const t = title.toLowerCase();
  const tagList = (tags || []).map((x) => String(x).toLowerCase());

  if (
    t.includes("backend") ||
    t.includes("back-end") ||
    t.includes("back end") ||
    t.includes("node") ||
    t.includes("golang") ||
    t.includes("python developer") ||
    t.includes("api") ||
    t.includes("server") ||
    t.includes("java developer") ||
    t.includes("systems") ||
    tagList.some((tag) => ["backend", "node.js", "express", "fastapi", "django", "spring boot", "kafka", "redis", "postgresql", "mongodb", "sql", "golang"].includes(tag))
  ) {
    return "Backend";
  }

  if (
    t.includes("frontend") ||
    t.includes("front-end") ||
    t.includes("front end") ||
    t.includes("react") ||
    t.includes("ui") ||
    t.includes("vue") ||
    t.includes("angular") ||
    tagList.some((tag) => ["frontend", "react", "react.js", "next.js", "vue", "tailwind", "typescript", "javascript", "css"].includes(tag))
  ) {
    return "Frontend";
  }

  if (
    t.includes("ai") ||
    t.includes("ml") ||
    t.includes("machine learning") ||
    t.includes("data") ||
    t.includes("nlp") ||
    t.includes("llm") ||
    tagList.some((tag) => ["python", "ai", "ml", "pytorch", "nlp", "rag", "pandas", "data"].includes(tag))
  ) {
    return "AI/ML";
  }

  if (
    t.includes("devops") ||
    t.includes("cloud") ||
    t.includes("sre") ||
    t.includes("infrastructure") ||
    tagList.some((tag) => ["devops", "cloud", "aws", "kubernetes", "docker", "terraform", "ci/cd"].includes(tag))
  ) {
    return "DevOps";
  }

  return "Full-Stack";
};

export const fetchLiveJobs = async (options = {}) => {
  const { forceRefresh = false } = options;
  const now = Date.now();

  if (!forceRefresh && jobsCache.data.length > 0 && now - jobsCache.lastFetched < CACHE_TTL_MS) {
    return jobsCache.data;
  }

  const normalizedJobs = [...INDIA_TECH_JOBS_FEED];

  // 1. Fetch from Arbeitnow (European & Global Tech API)
  try {
    const arbeitnowRes = await axios.get("https://www.arbeitnow.com/api/job-board-api", { timeout: 7000 });
    const jobs = arbeitnowRes.data?.data || [];
    for (const j of jobs.slice(0, 25)) {
      const tags = (j.tags || []).slice(0, 6);
      const domain = detectJobDomain(j.title, tags);
      normalizedJobs.push({
        id: `ab-${j.slug || Math.random().toString(36).substring(2, 8)}`,
        title: j.title,
        company: j.company_name,
        location: j.location || "Remote",
        remote: j.remote ?? true,
        type: (j.title || "").toLowerCase().includes("intern") ? "Internship" : "Full Time",
        grad_year: ["2024", "2025", "2026"],
        domain,
        url: j.url,
        tags,
        description: (j.description || "").replace(/<[^>]*>?/gm, "").slice(0, 300) + "...",
        source: "Arbeitnow Global",
        stipend_salary: "Competitive",
        posted_at: new Date(j.created_at * 1000 || now).toLocaleDateString(),
      });
    }
  } catch (err) {
    console.log("Arbeitnow API notice:", err.message);
  }

  // 2. Fetch from Remotive (Software Dev Remote API)
  try {
    const remotiveRes = await axios.get("https://remotive.com/api/remote-jobs?category=software-dev&limit=20", { timeout: 7000 });
    const jobs = remotiveRes.data?.jobs || [];
    for (const j of jobs.slice(0, 20)) {
      const tags = (j.tags || []).slice(0, 6);
      const domain = detectJobDomain(j.title, tags);
      normalizedJobs.push({
        id: `rm-${j.id || Math.random().toString(36).substring(2, 8)}`,
        title: j.title,
        company: j.company_name,
        location: j.candidate_required_location || "Worldwide Remote",
        remote: true,
        type: (j.title || "").toLowerCase().includes("intern") ? "Internship" : "Full Time",
        grad_year: ["2024", "2025", "2026"],
        domain,
        url: j.url,
        tags,
        description: (j.description || "").replace(/<[^>]*>?/gm, "").slice(0, 300) + "...",
        source: "Remotive Remote",
        stipend_salary: j.salary || "Competitive",
        posted_at: new Date(j.publication_date || now).toLocaleDateString(),
      });
    }
  } catch (err) {
    console.log("Remotive API notice:", err.message);
  }

  // 3. Fetch from Jobicy (Developer Jobs API)
  try {
    const jobicyRes = await axios.get("https://jobicy.com/api/v2/remote-jobs?count=20&tag=developer", { timeout: 7000 });
    const jobs = jobicyRes.data?.jobs || [];
    for (const j of jobs.slice(0, 20)) {
      const jobTypeStr = Array.isArray(j.jobType) ? j.jobType.join(" ") : String(j.jobType || "");
      const tags = (j.jobIndustry || []).slice(0, 5);
      const domain = detectJobDomain(j.jobTitle, tags);
      normalizedJobs.push({
        id: `jc-${j.id || Math.random().toString(36).substring(2, 8)}`,
        title: j.jobTitle,
        company: j.companyName,
        location: j.jobGeo || "Remote",
        remote: true,
        type: jobTypeStr.toLowerCase().includes("intern") ? "Internship" : "Full Time",
        grad_year: ["2024", "2025", "2026"],
        domain,
        url: j.url,
        tags,
        description: (j.jobExcerpt || "").replace(/<[^>]*>?/gm, "").slice(0, 300) + "...",
        source: "Jobicy Tech",
        stipend_salary: "Competitive",
        posted_at: "Recent",
      });
    }
  } catch (err) {
    console.log("Jobicy API notice:", err.message);
  }

  jobsCache = {
    data: normalizedJobs,
    lastFetched: now,
  };

  return normalizedJobs;
};

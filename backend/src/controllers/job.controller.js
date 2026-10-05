import { fetchLiveJobs } from "../services/job.service.js";
import { calculateJobMatch } from "../services/match.service.js";

const filterJobs = (jobs, filters) => {
  const { grad_year, type, location, domain, search } = filters;

  return jobs.filter((j) => {
    // 1. Graduation year filter
    if (grad_year && grad_year !== "all") {
      if (Array.isArray(j.grad_year) && !j.grad_year.includes(grad_year)) {
        return false;
      }
    }

    // 2. Type filter (Internship vs Full Time)
    if (type && type !== "all") {
      if (type.toLowerCase() === "internship" && j.type.toLowerCase() !== "internship") {
        return false;
      }
      if (type.toLowerCase() === "full-time" && j.type.toLowerCase() !== "full time") {
        return false;
      }
    }

    // 3. Location filter (India vs Remote)
    if (location && location !== "all") {
      if (location.toLowerCase() === "india") {
        const isIndia = (j.location || "").toLowerCase().includes("india") || (j.source || "").toLowerCase().includes("india");
        if (!isIndia) return false;
      } else if (location.toLowerCase() === "remote") {
        if (!j.remote) return false;
      }
    }

    // 4. Domain filter
    if (domain && domain !== "all") {
      const d = domain.toLowerCase();
      const jobDomain = (j.domain || "").toLowerCase();
      const jobTitle = (j.title || "").toLowerCase();
      const jobTags = (j.tags || []).map((t) => String(t).toLowerCase());

      let matchesDomain = jobDomain === d;

      if (!matchesDomain) {
        if (d === "backend") {
          matchesDomain =
            jobDomain.includes("backend") ||
            jobTitle.includes("backend") ||
            jobTitle.includes("back-end") ||
            jobTitle.includes("back end") ||
            jobTitle.includes("node") ||
            jobTitle.includes("golang") ||
            jobTitle.includes("python developer") ||
            jobTitle.includes("api") ||
            jobTitle.includes("server") ||
            jobTitle.includes("java developer") ||
            jobTitle.includes("systems") ||
            jobTags.some((t) => ["backend", "node.js", "node", "python", "java", "go", "golang", "sql", "postgresql", "mongodb", "kafka", "redis", "express", "fastapi", "spring boot", "rest apis"].includes(t));
        } else if (d === "frontend") {
          matchesDomain =
            jobDomain.includes("frontend") ||
            jobTitle.includes("frontend") ||
            jobTitle.includes("front-end") ||
            jobTitle.includes("front end") ||
            jobTitle.includes("react") ||
            jobTitle.includes("ui") ||
            jobTitle.includes("vue") ||
            jobTitle.includes("angular") ||
            jobTitle.includes("web") ||
            jobTags.some((t) => ["frontend", "react", "react.js", "next.js", "vue", "angular", "tailwind", "tailwind css", "typescript", "javascript", "css", "html", "redux"].includes(t));
        } else if (d === "full-stack" || d === "fullstack") {
          matchesDomain =
            jobDomain.includes("full") ||
            jobTitle.includes("full") ||
            jobTitle.includes("stack") ||
            jobTitle.includes("software engineer") ||
            jobTitle.includes("sde") ||
            jobTitle.includes("developer");
        } else if (d === "ai/ml" || d === "ai" || d === "ml") {
          matchesDomain =
            jobDomain.includes("ai") ||
            jobTitle.includes("ai") ||
            jobTitle.includes("ml") ||
            jobTitle.includes("machine learning") ||
            jobTitle.includes("data") ||
            jobTitle.includes("deep learning") ||
            jobTitle.includes("nlp") ||
            jobTags.some((t) => ["ai", "ml", "python", "pytorch", "nlp", "rag", "rag / llms", "pandas", "data"].includes(t));
        } else if (d === "devops") {
          matchesDomain =
            jobDomain.includes("devops") ||
            jobTitle.includes("devops") ||
            jobTitle.includes("cloud") ||
            jobTitle.includes("sre") ||
            jobTitle.includes("infrastructure") ||
            jobTags.some((t) => ["devops", "cloud", "aws", "kubernetes", "docker", "sre", "terraform", "ci/cd", "linux"].includes(t));
        }
      }

      if (!matchesDomain) {
        return false;
      }
    }

    // 5. Search text filter
    if (search && search.trim()) {
      const q = search.toLowerCase();
      const inTitle = (j.title || "").toLowerCase().includes(q);
      const inCompany = (j.company || "").toLowerCase().includes(q);
      const inLoc = (j.location || "").toLowerCase().includes(q);
      const inTags = (j.tags || []).some((t) => t.toLowerCase().includes(q));
      if (!inTitle && !inCompany && !inLoc && !inTags) {
        return false;
      }
    }

    return true;
  });
};

export const getLiveJobsList = async (req, res) => {
  try {
    const force = req.query.refresh === "true";
    const allJobs = await fetchLiveJobs({ forceRefresh: force });
    const filtered = filterJobs(allJobs, req.query);

    return res.status(200).json({
      message: "Live jobs fetched successfully",
      count: filtered.length,
      total_unfiltered: allJobs.length,
      data: filtered,
    });
  } catch (error) {
    console.error("Error fetching live jobs:", error.message);
    return res.status(500).json({
      message: "Failed to fetch live jobs",
      details: error.message,
    });
  }
};

export const getRecommendedJobs = async (req, res) => {
  try {
    const { user_skills, grad_year, type, location, domain, search, profile_source, project_tech } = req.body;
    const skills = Array.isArray(user_skills) ? user_skills.filter(Boolean) : [];
    const allJobs = await fetchLiveJobs();
    const filteredJobs = filterJobs(allJobs, { grad_year, type, location, domain, search });

    const candidate = {
      skills,
      project_tech: project_tech || "",
    };

    const rankedJobs = filteredJobs.map((j) => {
      const match = calculateJobMatch(candidate, j);
      return {
        ...j,
        match_score: match.matchScore,
        matched_skills: match.matchedSkills,
        missing_skills: match.missingSkills,
        match_source: profile_source || "semantic_match",
      };
    });

    rankedJobs.sort((a, b) => b.match_score - a.match_score);

    return res.status(200).json({
      message: "Recommended jobs generated successfully",
      count: rankedJobs.length,
      total_unfiltered: allJobs.length,
      data: rankedJobs,
    });
  } catch (error) {
    console.error("Error matching jobs:", error.message);
    return res.status(500).json({
      message: "Failed to generate job recommendations",
      details: error.message,
    });
  }
};

export const calculateMatchScore = async (req, res) => {
  try {
    const { job, candidate } = req.body;
    if (!job) {
      return res.status(400).json({ message: "Job object is required" });
    }
    const result = calculateJobMatch(candidate || {}, job);
    return res.status(200).json({
      message: "Match score calculated successfully",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to calculate match score", details: error.message });
  }
};

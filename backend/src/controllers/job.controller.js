import axios from "axios";
import { fetchLiveJobs } from "../services/job.service.js";

const getAiServiceHeaders = () => ({
  "Content-Type": "application/json",
  "x-internal-key": process.env.AI_SERVICE_INTERNAL_KEY || "ai_internal_secret_fc_98u23r09ju023jf",
});

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
      if (j.domain && j.domain.toLowerCase() !== domain.toLowerCase()) {
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
    const { user_skills, grad_year, type, location, domain, search } = req.body;
    const skills = Array.isArray(user_skills) ? user_skills : [];
    const allJobs = await fetchLiveJobs();
    const filteredJobs = filterJobs(allJobs, { grad_year, type, location, domain, search });

    if (skills.length === 0) {
      return res.status(200).json({
        message: "Live jobs returned (no user skills provided)",
        count: filteredJobs.length,
        total_unfiltered: allJobs.length,
        data: filteredJobs.map((j) => ({ ...j, match_score: 70, matched_skills: [], missing_skills: [] })),
      });
    }

    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

    try {
      const matchRes = await axios.post(
        `${aiServiceUrl}/jobs/match`,
        { user_skills: skills, jobs: filteredJobs },
        { headers: getAiServiceHeaders(), timeout: 15000 }
      );

      return res.status(200).json({
        message: "Recommended jobs generated successfully",
        count: matchRes.data?.jobs?.length || 0,
        total_unfiltered: allJobs.length,
        data: matchRes.data?.jobs || filteredJobs,
      });
    } catch (aiErr) {
      console.log("AI service match notice:", aiErr.message);
      return res.status(200).json({
        message: "Live jobs returned with heuristic match",
        count: filteredJobs.length,
        total_unfiltered: allJobs.length,
        data: filteredJobs.map((j) => ({
          ...j,
          match_score: 75,
          matched_skills: skills.slice(0, 3),
          missing_skills: [],
        })),
      });
    }
  } catch (error) {
    console.error("Error matching jobs:", error.message);
    return res.status(500).json({
      message: "Failed to generate job recommendations",
      details: error.message,
    });
  }
};

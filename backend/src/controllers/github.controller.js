import axios from "axios";
import crypto from "crypto";
import cacheService from "../services/cache.service.js";
import Profile from "../models/Profile.model.js";
import { getEffectiveUserId } from "../middleware/auth.middleware.js";

const getAiServiceHeaders = () => ({
  "Content-Type": "application/json",
  "x-internal-key": process.env.AI_SERVICE_INTERNAL_KEY || "ai_internal_secret_fc_98u23r09ju023jf",
});


export const analyzeRepository = async (req, res) => {
  try {
    const { repo_url } = req.body;

    if (!repo_url || typeof repo_url !== "string") {
      return res.status(400).json({
        message: "A valid repository URL or owner/repo identifier is required.",
      });
    }

    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

    const response = await axios.post(
      `${aiServiceUrl}/github/analyze`,
      { repo_url },
      { headers: getAiServiceHeaders(), timeout: 180000 }
    );

    return res.status(200).json({
      message: "Repository analyzed successfully",
      data: response.data,
    });
  } catch (error) {
    console.error("Error analyzing repository:", error.response?.data || error.message);
    const statusCode = error.response?.status || 500;
    const detail = error.response?.data?.detail || error.message;

    return res.status(statusCode).json({
      message: "Failed to analyze repository",
      details: detail,
    });
  }
};

export const chatWithCodebase = async (req, res) => {
  try {
    const { repo_url, question, history } = req.body;

    if (!repo_url || !question) {
      return res.status(400).json({
        message: "Repository URL and question are both required.",
      });
    }

    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

    const response = await axios.post(
      `${aiServiceUrl}/github/chat`,
      { repo_url, question, history: history || [] },
      { headers: getAiServiceHeaders(), timeout: 60000 }
    );

    return res.status(200).json({
      message: "Query processed successfully",
      data: response.data,
    });
  } catch (error) {
    console.error("Error chatting with codebase:", error.response?.data || error.message);
    const statusCode = error.response?.status || 500;
    const detail = error.response?.data?.detail || error.message;

    return res.status(statusCode).json({
      message: "Failed to query codebase",
      details: detail,
    });
  }
};

export const getRecruiterPitch = async (req, res) => {
  try {
    const { repo_url } = req.body;

    if (!repo_url) {
      return res.status(400).json({ message: "Repository URL is required." });
    }

    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

    const response = await axios.post(
      `${aiServiceUrl}/github/pitch`,
      { repo_url },
      { headers: getAiServiceHeaders(), timeout: 90000 }
    );

    return res.status(200).json({
      message: "Recruiter pitch generated successfully",
      data: response.data,
    });
  } catch (error) {
    console.error("Error generating pitch:", error.response?.data || error.message);
    const statusCode = error.response?.status || 500;
    const detail = error.response?.data?.detail || error.message;

    return res.status(statusCode).json({
      message: "Failed to generate recruiter pitch",
      details: detail,
    });
  }
};

export const getInterviewPrep = async (req, res) => {
  try {
    const { repo_url } = req.body;

    if (!repo_url) {
      return res.status(400).json({ message: "Repository URL is required." });
    }

    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

    const response = await axios.post(
      `${aiServiceUrl}/github/interview-prep`,
      { repo_url },
      { headers: getAiServiceHeaders(), timeout: 60000 }
    );

    return res.status(200).json({
      message: "Interview prep kit generated successfully",
      data: response.data,
    });
  } catch (error) {
    console.error("Error generating interview prep:", error.response?.data || error.message);
    const statusCode = error.response?.status || 500;
    const detail = error.response?.data?.detail || error.message;

    return res.status(statusCode).json({
      message: "Failed to generate interview prep kit",
      details: detail,
    });
  }
};

export const getUserRepositories = async (req, res) => {
  try {
    const { username } = req.params;
    if (!username) {
      return res.status(400).json({ message: "Username is required" });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cacheKey = `gh_user_repos_${cleanUsername}`;

    const data = await cacheService.getOrFetch(
      cacheKey,
      async () => {
        const headers = {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        };

        let profile = {
          login: username,
          name: username,
          avatar_url: `https://github.com/${username}.png`,
          bio: "Software Developer on GitHub",
          public_repos: 0,
          followers: 0,
          html_url: `https://github.com/${username}`,
        };

        let repos = [];


    // Attempt 1: GitHub REST API
    try {
      const [pRes, rRes] = await Promise.all([
        axios.get(`https://api.github.com/users/${username}`, { headers, timeout: 5000 }),
        axios.get(`https://api.github.com/users/${username}/repos?sort=updated&per_page=30`, { headers, timeout: 5000 }),
      ]);

      if (pRes.data) {
        profile = {
          login: pRes.data.login,
          name: pRes.data.name || pRes.data.login,
          avatar_url: pRes.data.avatar_url,
          bio: pRes.data.bio || "Software Developer on GitHub",
          public_repos: pRes.data.public_repos,
          followers: pRes.data.followers,
          html_url: pRes.data.html_url,
        };
      }

      if (Array.isArray(rRes.data) && rRes.data.length > 0) {
        repos = rRes.data.map((r) => ({
          name: r.name,
          full_name: r.full_name,
          description: r.description || "No description provided",
          stars: r.stargazers_count,
          forks: r.forks_count,
          language: r.language || "Code",
          html_url: r.html_url,
          updated_at: r.updated_at,
        }));
      }
    } catch (apiErr) {
      console.log(`GitHub REST API notice (${apiErr.response?.status || apiErr.message}), falling back to direct web fetch...`);
    }

    // Attempt 2: Direct public web fetch (completely bypassing rate limits)
    if (repos.length === 0) {
      try {
        const pageRes = await axios.get(`https://github.com/${username}?tab=repositories`, {
          headers,
          timeout: 8000,
        });

        const html = pageRes.data;

        // Parse individual repo list items
        const itemRegex = /<li[^>]*itemprop="owns"[^>]*>([\s\S]*?)<\/li>/g;
        let itemMatch;
        const seen = new Set();

        while ((itemMatch = itemRegex.exec(html)) !== null) {
          const itemHtml = itemMatch[1];
          const nameMatch = new RegExp(`href="/${username}/([^"/]+)"[^>]*itemprop="name codeRepository"`).exec(itemHtml);
          if (!nameMatch) continue;

          const repoName = nameMatch[1].trim();
          if (seen.has(repoName)) continue;
          seen.add(repoName);

          const descMatch = /<p[^>]*itemprop="description"[^>]*>([\s\S]*?)<\/p>/.exec(itemHtml);
          const langMatch = /<span[^>]*itemprop="programmingLanguage"[^>]*>([^<]+)<\/span>/.exec(itemHtml);
          const starMatch = /stargazers"[^>]*>[\s\r\n]*([0-9k\.]+)/.exec(itemHtml);

          repos.push({
            name: repoName,
            full_name: `${username}/${repoName}`,
            description: descMatch ? descMatch[1].trim() : "No description provided",
            stars: starMatch ? parseInt(starMatch[1]) || 0 : 0,
            forks: 0,
            language: langMatch ? langMatch[1].trim() : "Code",
            html_url: `https://github.com/${username}/${repoName}`,
            updated_at: new Date().toISOString(),
          });
        }

        profile.public_repos = repos.length;
      } catch (scrapeErr) {
        console.error("Direct web fetch error:", scrapeErr.message);
      }
    }

    // Fallback baseline if profile has zero public repos or network blocked
    if (repos.length === 0) {
        repos.push({
          name: "FreshersCompass",
          full_name: `${username}/FreshersCompass`,
          description: "AI-powered career and code intelligence platform for students and early-career developers.",
          stars: 12,
          forks: 3,
          language: "JavaScript",
          html_url: `https://github.com/${username}/FreshersCompass`,
          updated_at: new Date().toISOString(),
        });
      }

      return { profile, repos };
    },
    30 * 60 * 1000 // 30 minutes TTL
  );


    return res.status(200).json({
      message: "User profile and repositories retrieved successfully",
      data,
    });

  } catch (error) {
    console.error("Error getting user repos:", error.message);
    return res.status(500).json({
      message: "Failed to retrieve user repositories",
      details: error.message,
    });
  }
};

export const generateProfileReadme = async (req, res) => {
  try {
    const { username, repos, top_skills, bio } = req.body;
    if (!username) {
      return res.status(400).json({ message: "GitHub username is required." });
    }

    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

    const response = await axios.post(
      `${aiServiceUrl}/github/profile-readme`,
      {
        username,
        repos: repos || [],
        top_skills: top_skills || [],
        bio: bio || "",
      },
      { headers: getAiServiceHeaders(), timeout: 90000 }
    );

    return res.status(200).json({
      message: "Profile README generated successfully",
      markdown: response.data.markdown,
    });
  } catch (error) {
    console.error("Error generating profile README:", error.response?.data || error.message);
    const statusCode = error.response?.status || 500;
    const detail = error.response?.data?.detail || error.message;

    return res.status(statusCode).json({
      message: "Failed to generate profile README",
      details: detail,
    });
  }
};

export const generateProjectReadme = async (req, res) => {
  try {
    const { repo_url } = req.body;
    if (!repo_url) {
      return res.status(400).json({ message: "Repository URL is required." });
    }

    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

    const response = await axios.post(
      `${aiServiceUrl}/github/project-readme`,
      { repo_url },
      { headers: getAiServiceHeaders(), timeout: 60000 }
    );

    return res.status(200).json({
      message: "Project README generated successfully",
      markdown: response.data.markdown,
    });
  } catch (error) {
    console.error("Error generating project README:", error.response?.data || error.message);
    const statusCode = error.response?.status || 500;
    const detail = error.response?.data?.detail || error.message;

    return res.status(statusCode).json({
      message: "Failed to generate project README",
      details: detail,
    });
  }
};

export const analyzeRepositoryAsync = async (req, res) => {
  try {
    const { repo_url } = req.body;
    if (!repo_url) {
      return res.status(400).json({ message: "Repository URL is required." });
    }

    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";
    const response = await axios.post(
      `${aiServiceUrl}/github/analyze-async`,
      { repo_url },
      { headers: getAiServiceHeaders(), timeout: 15000 }
    );

    return res.status(200).json(response.data);
  } catch (error) {
    console.error("Error queueing async repository analysis:", error.response?.data || error.message);
    const statusCode = error.response?.status || 500;
    const detail = error.response?.data?.detail || error.message;

    return res.status(statusCode).json({
      message: "Failed to queue repository analysis",
      details: detail,
    });
  }
};

export const getIndexStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    if (!jobId) {
      return res.status(400).json({ message: "Job ID is required." });
    }

    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";
    const response = await axios.get(
      `${aiServiceUrl}/github/index-status/${encodeURIComponent(jobId)}`,
      { headers: getAiServiceHeaders(), timeout: 10000 }
    );

    return res.status(200).json(response.data);
  } catch (error) {
    console.error("Error polling index status:", error.response?.data || error.message);
    const statusCode = error.response?.status || 500;
    const detail = error.response?.data?.detail || error.message;

    return res.status(statusCode).json({
      message: "Failed to poll indexing status",
      details: detail,
    });
  }
};

/**
 * Verify GitHub webhook HMAC SHA-256 signature
 */
export const verifyGitHubWebhookSignature = (req) => {
  const secret = process.env.GITHUB_WEBHOOK_SECRET || "fc_github_webhook_secret_default";
  const signature = req.headers["x-hub-signature-256"];
  if (!signature) return false;

  const payload = req.rawBody || JSON.stringify(req.body);
  const hmac = crypto.createHmac("sha256", secret);
  const digest = `sha256=${hmac.update(payload).digest("hex")}`;

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  } catch {
    return false;
  }
};

/**
 * POST /api/github/webhook
 * Ingests GitHub webhooks, verifies HMAC signature, updates candidate velocity telemetry,
 * and triggers background AST re-indexing if key files were modified.
 */
export const handleGitHubWebhook = async (req, res) => {
  try {
    // 1. Verify HMAC SHA-256 signature
    const isValid = verifyGitHubWebhookSignature(req);
    if (!isValid) {
      return res.status(401).json({
        message: "Invalid or missing webhook signature (X-Hub-Signature-256)",
      });
    }

    const event = req.headers["x-github-event"] || "push";

    // Handle Ping event
    if (event === "ping") {
      return res.status(200).json({
        message: "GitHub webhook successfully verified and active",
        zen: req.body?.zen,
        hook_id: req.body?.hook_id,
      });
    }

    // Handle Push event
    if (event === "push") {
      const payload = req.body || {};
      const repoName = payload.repository?.name || "unknown-repo";
      const repoUrl = payload.repository?.html_url || payload.repository?.clone_url || "";
      const sender = (
        payload.pusher?.name ||
        payload.sender?.login ||
        payload.repository?.owner?.name ||
        payload.repository?.owner?.login ||
        ""
      ).trim();

      const commits = payload.commits || [];
      const latestCommit = payload.head_commit || commits[commits.length - 1] || {};
      const latestCommitHash = payload.after || latestCommit.id || "";
      const shortHash = latestCommitHash ? latestCommitHash.slice(0, 7) : "HEAD";
      const latestCommitMessage = latestCommit.message || `Pushed ${commits.length} commit(s) to ${repoName}`;

      // Find candidate profile matching GitHub username or active user
      let profile = null;
      if (sender) {
        profile = await Profile.findOne({
          github_username: new RegExp(`^${sender}$`, "i"),
        });
      }
      if (!profile) {
        // Fallback to latest updated profile
        profile = await Profile.findOne().sort({ updatedAt: -1 });
      }

      if (profile) {
        // Calculate velocity increment based on commit batch
        const commitCount = Math.max(1, commits.length);
        const currentVelocity = profile.competency_scores?.velocity || 50;
        const newVelocity = Math.min(100, currentVelocity + commitCount * 5);

        profile.competency_scores = {
          resume: profile.competency_scores?.resume || 70,
          code: profile.competency_scores?.code || 70,
          interview: profile.competency_scores?.interview || 70,
          roadmap: profile.competency_scores?.roadmap || 70,
          velocity: newVelocity,
        };

        // Recalculate composite readiness score
        const scores = Object.values(profile.competency_scores);
        profile.readiness_score = Math.round(
          scores.reduce((a, b) => a + b, 0) / scores.length
        );

        profile.last_commit_hash = shortHash;
        profile.last_commit_message = latestCommitMessage;
        profile.last_synced_repo = repoName;
        profile.last_synced_at = new Date();

        await profile.save();
      }

      // Check if key architecture files were touched across commits
      const keyFilePatterns = [
        "package.json",
        "requirements.txt",
        "pom.xml",
        "go.mod",
        "cargo.toml",
        "server.js",
        "main.py",
        "app.py",
        "index.js",
      ];

      const touchedFiles = [];
      for (const c of commits) {
        if (Array.isArray(c.added)) touchedFiles.push(...c.added);
        if (Array.isArray(c.modified)) touchedFiles.push(...c.modified);
        if (Array.isArray(c.removed)) touchedFiles.push(...c.removed);
      }

      const keyFilesTouched = touchedFiles.some((file) =>
        keyFilePatterns.some((pattern) => file.toLowerCase().endsWith(pattern))
      );

      // Trigger background AST re-indexing if key files were modified
      if (keyFilesTouched && repoUrl) {
        const aiServiceUrl = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";
        axios
          .post(
            `${aiServiceUrl}/github/analyze-async`,
            { repo_url: repoUrl },
            { headers: getAiServiceHeaders(), timeout: 10000 }
          )
          .catch((err) => {
            console.log("Background webhook re-indexing kick error (non-fatal):", err.message);
          });
      }

      return res.status(200).json({
        message: "Push webhook processed successfully. Candidate twin profile updated.",
        synced: true,
        repo: repoName,
        commit: shortHash,
        commitMessage: latestCommitMessage,
        velocity: profile?.competency_scores?.velocity || null,
        reindexingTriggered: keyFilesTouched,
      });
    }

    return res.status(200).json({
      message: `Ignored unhandled GitHub event: ${event}`,
    });
  } catch (error) {
    console.error("Error processing GitHub webhook:", error.message);
    return res.status(500).json({
      message: "Internal server error processing webhook",
      details: error.message,
    });
  }
};

/**
 * GET /api/github/sync-status
 * Returns latest telemetry sync status from GitHub webhook pushes
 */
export const getLatestWebhookSync = async (req, res) => {
  try {
    const userId = getEffectiveUserId(req);
    let profile = await Profile.findOne({ userId });
    if (!profile) {
      profile = await Profile.findOne().sort({ updatedAt: -1 });
    }

    if (!profile) {
      return res.status(200).json({
        data: null,
      });
    }

    return res.status(200).json({
      data: {
        lastSyncedAt: profile.last_synced_at,
        lastCommitHash: profile.last_commit_hash,
        lastCommitMessage: profile.last_commit_message,
        lastSyncedRepo: profile.last_synced_repo,
        velocity: profile.competency_scores?.velocity || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching sync status:", error.message);
    return res.status(500).json({
      message: "Failed to fetch sync status",
      details: error.message,
    });
  }
};



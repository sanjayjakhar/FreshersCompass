import axios from 'axios';

const getAiServiceHeaders = () => ({
  'Content-Type': 'application/json',
  'x-internal-key': process.env.AI_SERVICE_INTERNAL_KEY || 'ai_internal_secret_fc_98u23r09ju023jf',
});

export const generateInterviewQuestions = async (req, res) => {
  try {
    const { role, skills, resume_text, repositories, project_descriptions } = req.body || {};

    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

    const response = await axios.post(
      `${aiServiceUrl}/interview/generate-questions`,
      {
        role: role || 'Full-Stack Software Engineer',
        skills: Array.isArray(skills) ? skills : [],
        resume_text: typeof resume_text === 'string' ? resume_text : '',
        repositories: Array.isArray(repositories) ? repositories : [],
        project_descriptions: Array.isArray(project_descriptions) ? project_descriptions : [],
      },
      { headers: getAiServiceHeaders(), timeout: 40000 }
    );

    return res.status(200).json({
      message: 'Adaptive questions generated',
      data: response.data.data,
    });
  } catch (error) {
    console.error('Error generating interview questions:', error.response?.data || error.message);
    const statusCode = error.response?.status || 500;
    const detail = error.response?.data?.detail || error.message;

    return res.status(statusCode).json({
      message: 'Failed to generate adaptive questions',
      details: detail,
    });
  }
};

export const evaluateInterview = async (req, res) => {
  try {
    const { responses, role } = req.body;

    if (!responses || !Array.isArray(responses) || responses.length === 0) {
      return res.status(400).json({
        message: 'Valid responses array is required for interview evaluation.',
      });
    }

    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

    /**
     * Forward per-answer timing so the evaluator can score pacing and
     * conciseness. Older clients omit these fields, so they stay optional.
     */
    const enrichedResponses = responses.map((item) => ({
      ...item,
      ...(Number.isFinite(Number(item?.time_spent_seconds))
        ? { time_spent_seconds: Number(item.time_spent_seconds) }
        : {}),
      ...(Number.isFinite(Number(item?.budget_seconds))
        ? { budget_seconds: Number(item.budget_seconds) }
        : {}),
      ...(typeof item?.auto_submitted === 'boolean' ? { auto_submitted: item.auto_submitted } : {}),
    }));

    const response = await axios.post(
      `${aiServiceUrl}/interview/evaluate`,
      { responses: enrichedResponses, role: role || 'Full-Stack Software Engineer' },
      { headers: getAiServiceHeaders(), timeout: 40000 }
    );

    return res.status(200).json({
      message: 'Interview evaluated successfully',
      data: response.data.data,
    });
  } catch (error) {
    console.error('Error evaluating interview in backend:', error.response?.data || error.message);
    const statusCode = error.response?.status || 500;
    const detail = error.response?.data?.detail || error.message;

    return res.status(statusCode).json({
      message: 'Failed to evaluate interview responses',
      details: detail,
    });
  }
};

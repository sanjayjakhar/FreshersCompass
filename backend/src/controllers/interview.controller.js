import axios from 'axios';

const getAiServiceHeaders = () => ({
  'Content-Type': 'application/json',
  'x-internal-key': process.env.AI_SERVICE_INTERNAL_KEY || 'ai_internal_secret_fc_98u23r09ju023jf',
});

export const evaluateInterview = async (req, res) => {
  try {
    const { responses, role } = req.body;

    if (!responses || !Array.isArray(responses) || responses.length === 0) {
      return res.status(400).json({
        message: 'Valid responses array is required for interview evaluation.',
      });
    }

    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

    const response = await axios.post(
      `${aiServiceUrl}/interview/evaluate`,
      { responses, role: role || 'Full-Stack Software Engineer' },
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

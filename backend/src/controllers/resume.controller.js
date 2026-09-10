import axios from 'axios';
import FormData from 'form-data';

export const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Prepare form data to send to AI microservice
    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    // Send the buffer to Python AI Service
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    
    const response = await axios.post(`${aiServiceUrl}/resume/parse`, formData, {
      headers: {
        ...formData.getHeaders(),
        // Pass internal key to authorize this server-to-server request
        'x-internal-key': process.env.AI_SERVICE_INTERNAL_KEY
      }
    });

    // The AI service returns the parsed JSON
    return res.status(200).json({
      message: 'Resume parsed successfully',
      data: response.data
    });
  } catch (error) {
    console.error('Resume processing error:', error.response?.data || error.message);
    res.status(500).json({ 
      message: 'Error parsing resume', 
      details: error.response?.data || error.message 
    });
  }
};

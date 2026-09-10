import multer from 'multer';
import path from 'path';

// Use memory storage so we can forward the buffer directly to the Python AI service
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF and DOCX files are allowed.'), false);
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: process.env.MAX_FILE_SIZE_MB ? parseInt(process.env.MAX_FILE_SIZE_MB) * 1024 * 1024 : 5 * 1024 * 1024
  },
  fileFilter
});

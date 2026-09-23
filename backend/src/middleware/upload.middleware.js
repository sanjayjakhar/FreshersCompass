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
    cb(new Error('Invalid file extension. Only .pdf and .docx files are allowed.'), false);
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: process.env.MAX_FILE_SIZE_MB ? parseInt(process.env.MAX_FILE_SIZE_MB) * 1024 * 1024 : 5 * 1024 * 1024
  },
  fileFilter
});

/**
 * Validates actual binary magic bytes of the uploaded file buffer
 * to prevent extension-spoofing and malformed binary injection.
 */
export const validateResumeMagicBytes = (req, res, next) => {
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ message: 'No resume file buffer received.' });
  }

  const buf = req.file.buffer;
  const ext = path.extname(req.file.originalname).toLowerCase();

  // PDF Magic Bytes: %PDF- (0x25 0x50 0x44 0x46)
  const isPdf = buf.length >= 4 &&
    buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46;

  // DOCX Magic Bytes: PK\x03\x04 (0x50 0x4B 0x03 0x04)
  const isDocx = buf.length >= 4 &&
    buf[0] === 0x50 && buf[1] === 0x4B && buf[2] === 0x03 && buf[3] === 0x04;

  if (ext === '.pdf' && !isPdf) {
    return res.status(400).json({
      message: 'Invalid file signature. The uploaded file has a .pdf extension but does not contain a valid PDF binary header.',
    });
  }

  if (ext === '.docx' && !isDocx) {
    return res.status(400).json({
      message: 'Invalid file signature. The uploaded file has a .docx extension but does not contain a valid DOCX binary header.',
    });
  }

  if (!isPdf && !isDocx) {
    return res.status(400).json({
      message: 'Unsupported document format. Only genuine PDF and DOCX files are allowed.',
    });
  }

  next();
};


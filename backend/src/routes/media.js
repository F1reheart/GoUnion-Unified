import express from 'express';
import multer from 'multer';
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { uploadToCloudStorage, UPLOADS_PATH } from '../services/storage.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });
export const mediaRouter = Router();

// Serve locally-uploaded files
mediaRouter.use('/files', express.static(UPLOADS_PATH));

mediaRouter.post('/upload', requireAuth, upload.single('file'), asyncHandler(async (req, res) => {
  const uploaded = await uploadToCloudStorage(req.file);
  res.status(201).json(uploaded);
}));

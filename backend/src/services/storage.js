import { v2 as cloudinary } from 'cloudinary';
import { nanoid } from 'nanoid';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

const hasCloudinaryConfig = () =>
  Boolean(process.env.CLOUDINARY_URL || (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET));


const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');


if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const getExtension = (originalname = '', mimetype = '') => {
  const fromName = path.extname(originalname);
  if (fromName) return fromName;
  const map = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp', 'video/mp4': '.mp4', 'video/webm': '.webm', 'audio/webm': '.webm', 'audio/mpeg': '.mp3' };
  return map[mimetype] || '.bin';
};

const uploadLocally = (file) => {
  const ext = getExtension(file.originalname, file.mimetype);
  const filename = `${nanoid()}${ext}`;
  const filepath = path.join(UPLOADS_DIR, filename);
  fs.writeFileSync(filepath, file.buffer);

  
  const url = `/media/files/${filename}`;
  const resourceType = file.mimetype?.startsWith('video/') ? 'video' : file.mimetype?.startsWith('audio/') ? 'audio' : 'image';

  return {
    url,
    file_url: url,
    public_id: filename,
    resource_type: resourceType,
  };
};


export const uploadToCloudStorage = (file) => {
  if (!file) throw new HttpError(400, 'No file was uploaded.');

  
  if (!hasCloudinaryConfig()) {
    console.log('[Storage] Cloudinary not configured — using local file storage.');
    return uploadLocally(file);
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: env.cloudinaryFolder,
        resource_type: 'auto',
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve({
          url: result.secure_url,
          file_url: result.secure_url,
          public_id: result.public_id,
          resource_type: result.resource_type,
        });
      },
    );

    stream.end(file.buffer);
  });
};


export const UPLOADS_PATH = UPLOADS_DIR;

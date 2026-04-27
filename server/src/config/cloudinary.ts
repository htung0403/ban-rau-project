import { v2 as cloudinary } from 'cloudinary';
import { env } from './env';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME || 'diwmkhk0g',
  api_key: env.CLOUDINARY_API_KEY || '679633132267696',
  api_secret: env.CLOUDINARY_API_SECRET || 'QZ9pGYa6eX4SeJbKm4u7ApKTMHc'
});

export default cloudinary;

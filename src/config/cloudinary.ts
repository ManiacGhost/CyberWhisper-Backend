import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Verify Cloudinary connection on startup
cloudinary.api
  .ping()
  .then(() => {
    console.log('✓ Cloudinary connected successfully');
  })
  .catch((err) => {
    console.error('❌ Cloudinary connection failed:', err.message);
    console.error(
      '   Please check your CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET'
    );
  });

export default cloudinary;

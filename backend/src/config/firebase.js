const admin = require('firebase-admin');
const logger = require('../utils/logger');

/**
 * Initialise Firebase Admin SDK and expose the storage bucket.
 */
const initFirebase = () => {
  if (admin.apps.length) return admin.storage().bucket();

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });

  logger.info('Firebase Admin SDK initialised');
  return admin.storage().bucket();
};

/**
 * Upload a buffer to Firebase Storage and return a public URL.
 *
 * @param {Buffer} buffer   – file contents
 * @param {string} destPath – path inside the bucket (e.g. "notes/abc.pdf")
 * @param {string} mimeType – MIME type of the file
 * @returns {Promise<string>} signed download URL (valid 7 days)
 */
const uploadToFirebase = async (buffer, destPath, mimeType) => {
  const bucket = initFirebase();
  const file = bucket.file(destPath);

  await file.save(buffer, {
    metadata: { contentType: mimeType },
    resumable: false,
  });

  // Generate a signed URL valid for 7 days
  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });

  return url;
};

module.exports = { initFirebase, uploadToFirebase };

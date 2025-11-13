import admin from 'firebase-admin';
import config from '.';

// Path to service account file
const serviceAccountJson = config.firebase_service_account;

if (!admin.apps.length) {
  if (!serviceAccountJson) {
    console.error(
      'Firebase service account is missing. Check your environment variables.'
    );
    process.exit(1);
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountJson);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error('Invalid Firebase service account JSON:', error);
    process.exit(1);
  }
}

export const fcm = admin.messaging();

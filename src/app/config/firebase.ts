import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

// Path to service account file
const serviceAccountPath = path.join(__dirname, 'deligo-firebase-fcm.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Firebase service account file missing.');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountPath),
});

export const fcm = admin.messaging();

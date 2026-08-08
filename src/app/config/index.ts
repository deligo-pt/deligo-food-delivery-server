import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join((process.cwd(), '.env')) });

export default {
  NODE_ENV: process.env.NODE_ENV,
  port: process.env.PORT,
  ai: {
    geminiApiKey: process.env.GEMINI_API_KEY,
    openAiApiKey: process.env.OPENAI_API_KEY,
  },
  signature: {
    company_signature_1_url: process.env.COMPANY_SIGNATURE_1_URL,
    company_signature_2_url: process.env.COMPANY_SIGNATURE_2_URL,
  },
  frontend_urls: {
    vendor: process.env.FRONTEND_URL_VENDOR,
    admin: process.env.FRONTEND_URL_ADMIN,
    fleet_manager: process.env.FRONTEND_URL_FLEET_MANAGER,
    delivery_partner: process.env.FRONTEND_URL_DELIVERY_PARTNER,
    payment: process.env.FRONTEND_PAYMENT_URL,
    test: process.env.FRONTEND_URL_TEST,
  },
  backend_base_url: process.env.BACKEND_BASE_URL,
  bulkgate: {
    bulkgate_send_api_url: process.env.BULKGATE_SEND_API_URL,
    bulkgate_api_key: process.env.BULKGATE_API_KEY,
    bulkgate_app_id: process.env.BULKGATE_APP_ID,
    bulkgate_whatsapp_api_url: process.env.BULKGATE_WHATSAPP_API_URL,
    bulkgate_whatsapp_sender_id: process.env.BULKGATE_WHATSAPP_SENDER_ID,
  },
  google: {
    oauth_client_ids: (process.env.GOOGLE_OAUTH_CLIENT_IDS || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
  },
  facebook: {
    app_id: process.env.FACEBOOK_APP_ID,
    app_secret: process.env.FACEBOOK_APP_SECRET,
  },
  origins: process.env.ORIGINS,
  api_docs: {
    user: process.env.API_DOCS_USER,
    password: process.env.API_DOCS_PASSWORD,
  },
  db_url: process.env.DB_URL,
  bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS,
  jwt: {
    jwt_access_secret: process.env.JWT_ACCESS_SECRET,
    jwt_access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN,
    jwt_refresh_secret: process.env.JWT_REFRESH_SECRET,
    jwt_refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN,
  },
  super_admin: {
    super_admin_email: process.env.SUPER_ADMIN_EMAIL,
    super_admin_password: process.env.SUPER_ADMIN_PASSWORD,
    super_admin_profile_photo: process.env.SUPER_ADMIN_PROFILE_PHOTO,
    super_admin_contact_number: process.env.SUPER_ADMIN_CONTACT_NUMBER,
  },
  cloudinary: {
    cloudinary_cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    cloudinary_api_key: process.env.CLOUDINARY_API_KEY,
    cloudinary_api_secret: process.env.CLOUDINARY_API_SECRET,
  },
  sender_email: process.env.SENDER_EMAIL,
  sender_app_password: process.env.SENDER_APP_PASS,
  firebase_service_account: process.env.FIREBASE_SERVICE_ACCOUNT,
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD || undefined,
  },
  pastaDigital: {
    api_url: process.env.PD_API_URL,
    email: process.env.PD_EMAIL,
    password: process.env.PD_PASSWORD,
  },
  redUniq: {
    api_url: process.env.REDUNIQ_API_URL,
    username: process.env.REDUNIQ_USERNAME,
    password: process.env.REDUNIQ_PASSWORD,
  },
  google_maps_api_key: process.env.GOOGLE_MAPS_API_KEY,
  customer: {
    test_customer_email: process.env.TEST_CUSTOMER_EMAIL,
    test_customer_contact_number: process.env.TEST_CUSTOMER_CONTACT_NUMBER,
    test_customer_otp: process.env.TEST_CUSTOMER_OTP,
    test_customer_contact_otp: process.env.TEST_CUSTOMER_CONTACT_OTP,
  },
};

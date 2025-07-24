// Load environment variables from .env file
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Try to find the .env file
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  console.log(`Loading environment variables from ${envPath}`);
  dotenv.config({ path: envPath, override: true });
} else {
  console.warn(`No .env file found at ${envPath}`);
  dotenv.config({ override: true });
}

// Debug environment variables
console.log("Environment variables loaded:");
console.log("PORT:", process.env.PORT);
console.log("ITOP_API_URL:", process.env.ITOP_API_URL);
console.log("ITOP_API_VERSION:", process.env.ITOP_API_VERSION);
console.log("ITOP_API_USER:", process.env.ITOP_API_USER);
console.log("ITOP_API_PASSWORD exists:", !!process.env.ITOP_API_PASSWORD);
console.log("ITOP_DEFAULT_ORG_ID:", process.env.ITOP_DEFAULT_ORG_ID);
console.log("ITOP_SERVICE_NAME:", process.env.ITOP_SERVICE_NAME);
console.log("ITOP_SERVICESUBCATEGORY_NAME:", process.env.ITOP_SERVICESUBCATEGORY_NAME); 
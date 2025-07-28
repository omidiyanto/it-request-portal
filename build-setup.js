// build-setup.js
import { existsSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// Check if .env file exists
const envPath = resolve(process.cwd(), '.env');

if (!existsSync(envPath)) {
  console.log('Creating .env file with default timezone (UTC)...');
  
  const envContent = `
# API Configuration
# Add your API configuration here if needed

# Application Configuration
PORT=3000

# Timezone Configuration (UTC, Asia/Jakarta, America/New_York, Europe/London, etc.)
VITE_TIMEZONE=UTC
`;

  writeFileSync(envPath, envContent);
  console.log('.env file created successfully with default timezone (UTC)');
} else {
  console.log('.env file already exists, continuing with build...');
}

console.log('Build setup complete!'); 
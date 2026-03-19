import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import path from 'path';

if (!process.env.DATABASE_URL) {
  console.error("=========================================");
  console.error("FATAL ERROR: DATABASE_URL is missing!");
  console.error(`Current Directory: ${process.cwd()}`);
  console.error(`Attempting to load .env from: ${path.join(process.cwd(), '.env')}`);
  console.error("Check if .env is missing on your server or if variables should be in the dashboard.");
  console.error("=========================================");
}

const queryClient = postgres(process.env.DATABASE_URL);
export const db = drizzle(queryClient);



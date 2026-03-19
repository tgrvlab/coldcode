import 'dotenv/config';

/** @type { import("drizzle-kit").Config } */
export default {
  schema: "./db/schema.js",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  }
};

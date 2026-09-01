import dotenv from 'dotenv';
import { createApp } from '../server/app.js';

dotenv.config();

/**
 * Vercel serverless entry point. Every `/api/*` request is rewritten here by
 * vercel.json, and Express handles the routing from there. The app instance is
 * created once per warm container rather than per request.
 */
const app = createApp();

export default app;

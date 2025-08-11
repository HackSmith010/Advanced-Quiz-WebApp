import serverless from 'serverless-http';
import app from '../../api/index.js';

process.env.NETLIFY = 'true';

export const handler = serverless(app);

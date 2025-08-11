import serverless from 'serverless-http';
import app, { init } from '../../api/index.js';

process.env.NETLIFY = 'true'; 

export const handler = async (event, context) => {
  try {
    await init();
    return serverless(app)(event, context);
  } catch (err) {
    console.error('API function error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server error in API function' })
    };
  }
};

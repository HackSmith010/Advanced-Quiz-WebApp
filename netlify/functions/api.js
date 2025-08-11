import serverless from 'serverless-http';
import { initApp } from '../../index.js';

process.env.NETLIFY = 'true';

let serverlessHandler;

export const handler = async (event, context) => {
  if (!serverlessHandler) {
    const app = await initApp();
    serverlessHandler = serverless(app);
  }
  return serverlessHandler(event, context);
};

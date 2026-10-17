import { startServer } from './app.mjs';

await startServer({ production: process.argv.includes('--production') });

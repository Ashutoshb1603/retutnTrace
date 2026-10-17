import { FalkorDB } from 'falkordb';

// Read-only readiness check. It neither seeds nor changes any graph.
const socket = { connectTimeout: 2500, reconnectStrategy: false };
const options = process.env.FALKORDB_URL
  ? { url: process.env.FALKORDB_URL, socket }
  : {
      socket: {
        ...socket,
        host: process.env.FALKORDB_HOST || '127.0.0.1',
        port: Number(process.env.FALKORDB_PORT || 6380),
      },
      username: process.env.FALKORDB_USERNAME || undefined,
      password: process.env.FALKORDB_PASSWORD || undefined,
    };
let db;
try {
  db = await FalkorDB.connect(options);
  db.on('error', () => {});
  await db.list();
} catch {
  process.exitCode = 1;
} finally {
  if (db) await db.close();
}

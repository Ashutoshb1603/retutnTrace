import { startServer } from '../../server/app.mjs';
import { FixtureStore } from './fixture-store.mjs';

await startServer({
  production: true,
  storeFactory: async () => {
    const store = new FixtureStore({ directory: process.env.RETURNTRACE_DATA_DIR });
    await store.init();
    return store;
  },
});

import { loadServerEnv } from '@aura/config';
import { buildApp } from './app';
import { attachSockets } from './realtime/socket';

const env = loadServerEnv();

async function main() {
  const app = await buildApp();
  attachSockets(app.server);

  await app.listen({ port: env.API_PORT, host: '0.0.0.0' });
  app.log.info(`AuraTracker API ready on http://localhost:${env.API_PORT}`);
}

main().catch((err) => {
  console.error('Failed to start API:', err);
  process.exit(1);
});

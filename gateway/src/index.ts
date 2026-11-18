import app from './app';
import config from './config';
import { assertSpaBuild } from './routes/spa';

if (config.spa.enabled) {
  assertSpaBuild(config.spa.directory);
}

app.listen(config.port, () => {
  console.info(`Gateway running on port ${config.port.toString()}`);
  console.info(`Proxying /api/* → ${config.backendUrl}`);
  console.info(`Proxying /ws   → ${config.backendUrl} (WebSocket/STOMP)`);
});

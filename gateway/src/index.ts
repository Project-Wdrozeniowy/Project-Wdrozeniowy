import app from './app';
import config from './config';

app.listen(config.port, () => {
  console.info(`Gateway running on port ${config.port.toString()}`);
  console.info(`Proxying /api/* → ${config.backendUrl}`);
});

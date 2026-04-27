import morgan from 'morgan';
import type { Request } from 'express';

const FORMAT = ':method :url :status :res[content-length] bytes - :response-time ms';

const logger = morgan(FORMAT, {
  skip: (req: Request) => req.url === '/health',
});

export default logger;

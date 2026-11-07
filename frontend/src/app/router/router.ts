import { createBrowserRouter } from 'react-router';
import { routes } from './routes';

// Create one browser router outside React rendering. Tests use the same routes
// with createMemoryRouter, without starting a second browser router.
export const router = createBrowserRouter(routes);

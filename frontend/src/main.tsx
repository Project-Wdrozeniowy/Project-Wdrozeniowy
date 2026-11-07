import '@/app/configureValidation';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { createBrowserRouter } from 'react-router';
import '@/app/globals.css';
import { routes } from '@/app/routes';

createRoot(document.getElementById('root')!).render(
  <RouterProvider router={createBrowserRouter(routes)} />
);

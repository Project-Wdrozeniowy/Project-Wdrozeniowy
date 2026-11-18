import { useRouteError, isRouteErrorResponse, Link } from 'react-router';

export default function RouteErrorBoundary() {
  const error = useRouteError();
  return (
    <main className="min-h-screen bg-page p-8 text-fg">
      <h1>
        {isRouteErrorResponse(error) && error.status === 404
          ? 'Page not found'
          : 'Could not load this page'}
      </h1>
      <Link to="/">Return home</Link>
    </main>
  );
}

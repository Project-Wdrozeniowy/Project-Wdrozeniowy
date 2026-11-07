import { useRouteError, isRouteErrorResponse, Link } from 'react-router';

export default function RouteErrorBoundary() {
  const error = useRouteError();
  return (
    <main className="min-h-screen bg-slate-900 p-8 text-gray-50">
      <h1>
        {isRouteErrorResponse(error) && error.status === 404
          ? 'Page not found'
          : 'Could not load this page'}
      </h1>
      <Link to="/">Return home</Link>
    </main>
  );
}

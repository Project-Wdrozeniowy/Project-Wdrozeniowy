export default function ChartSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading chart"
      aria-busy="true"
      className="h-40 bg-raised rounded animate-pulse"
    />
  );
}

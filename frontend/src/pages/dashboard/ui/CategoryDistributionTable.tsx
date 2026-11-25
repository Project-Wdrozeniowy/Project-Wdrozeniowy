import type { CategoryRow } from '@/pages/dashboard/lib/dashboardView';
import { Link } from 'react-router';

const percentFormat = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 2,
});

interface CategoryDistributionTableProps {
  rows: CategoryRow[];
  title: string;
  destinations: Record<string, { href: string; label: string }>;
}

export default function CategoryDistributionTable({
  rows,
  title,
  destinations,
}: CategoryDistributionTableProps) {
  return (
    <table className="w-full table-fixed text-sm text-fg border-collapse">
      <caption className="text-left text-xs text-fg-subtle pb-2">{title}</caption>
      <thead>
        <tr className="border-b border-line text-fg-subtle">
          <th scope="col" className="w-[45%] text-left py-2 pr-2">
            Category
          </th>
          <th scope="col" className="w-1/5 text-right py-2 px-1">
            Posts
          </th>
          <th scope="col" className="w-[35%] text-right py-2 pl-1">
            Share
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key} className="border-b border-line last:border-b-0">
            <th
              scope="row"
              aria-label={row.label}
              className="text-left font-normal py-2 pr-2 wrap-anywhere"
            >
              <Link
                to={destinations[row.key].href}
                aria-label={destinations[row.key].label}
                className="inline-block min-h-6 min-w-6 underline rounded focus-visible:outline-2 focus-visible:outline-blue-500"
              >
                {row.label}
              </Link>
            </th>
            <td className="text-right py-2 px-1 tabular-nums wrap-anywhere">
              {row.posts.toLocaleString('en-US')}
            </td>
            <td className="text-right py-2 pl-1 tabular-nums">
              {row.share === null ? 'Not applicable' : percentFormat.format(row.share)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

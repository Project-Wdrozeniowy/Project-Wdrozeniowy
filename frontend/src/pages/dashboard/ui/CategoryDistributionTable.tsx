import type { CategoryRow } from '@/pages/dashboard/lib/dashboardView';

const percentFormat = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 2,
});

interface CategoryDistributionTableProps {
  rows: CategoryRow[];
  title: string;
}

export default function CategoryDistributionTable({ rows, title }: CategoryDistributionTableProps) {
  return (
    <table className="w-full table-fixed text-sm text-fg border-collapse">
      <caption className="text-left text-xs text-fg-subtle pb-2">{title}</caption>
      <thead>
        <tr className="border-b border-line text-fg-subtle">
          <th scope="col" className="w-1/2 text-left py-2 pr-2">
            Category
          </th>
          <th scope="col" className="text-right py-2 px-1">
            Posts
          </th>
          <th scope="col" className="text-right py-2 pl-1">
            Share
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key} className="border-b border-line last:border-b-0">
            <th scope="row" className="text-left font-normal py-2 pr-2 wrap-anywhere">
              {row.label}
            </th>
            <td className="text-right py-2 px-1 tabular-nums wrap-anywhere">
              {row.posts.toLocaleString('en-US')}
            </td>
            <td className="text-right py-2 pl-1 tabular-nums wrap-anywhere">
              {row.share === null ? 'Not applicable' : percentFormat.format(row.share)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

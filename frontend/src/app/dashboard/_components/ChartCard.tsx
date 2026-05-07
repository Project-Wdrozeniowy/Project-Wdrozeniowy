export default function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-800 rounded-xl p-5 flex flex-col gap-4">
      <h2 className="text-gray-50 font-semibold text-xl">{title}</h2>
      {children}
    </div>
  );
}

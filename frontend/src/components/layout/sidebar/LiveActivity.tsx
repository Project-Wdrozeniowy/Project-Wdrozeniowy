import { ACTIVITY_ITEMS } from '@/constants/sidebar';

export default function LiveActivity() {
  return (
    <div className="bg-slate-800 rounded-xl p-4 flex flex-col gap-4">
      <h2 className="text-gray-50 font-semibold text-xl leading-none">Live Activity</h2>
      <div className="flex flex-col gap-2">
        {ACTIVITY_ITEMS.map(({ color, label, value }) => (
          <div key={label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full ${color} flex items-center justify-center shrink-0`}
              >
                <span className="w-2 h-2 rounded-full bg-white opacity-80" />
              </div>
              <span className="text-gray-50 text-sm">{label}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-gray-50 font-semibold text-base">{value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

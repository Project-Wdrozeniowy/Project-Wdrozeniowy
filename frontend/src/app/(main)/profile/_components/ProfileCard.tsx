export default function ProfileCard() {
  return (
    <div className="bg-white rounded-xl p-6 flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-2xl font-bold shrink-0">
          JD
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <div className="h-6 w-40 bg-gray-100 rounded animate-pulse" />
          <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
          <div className="flex gap-2 mt-2">
            <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
            <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NotificationsLoading() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-6 w-32 bg-gray-200 rounded mb-6 animate-pulse" />
        <div className="mb-8">
          <div className="h-9 w-56 bg-gray-200 rounded mb-2 animate-pulse" />
          <div className="h-5 w-96 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-8">
          {[1, 2, 3].map((section) => (
            <div key={section}>
              <div className="h-6 w-48 bg-gray-200 rounded mb-4 animate-pulse" />
              <div className="space-y-4">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                      <div className="h-4 w-full max-w-md bg-gray-200 rounded animate-pulse" />
                    </div>
                    <div className="w-11 h-6 bg-gray-200 rounded-full animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

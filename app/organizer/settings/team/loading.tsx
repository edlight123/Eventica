export default function TeamLoading() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-6 w-32 bg-[#0a0a0a] rounded mb-6 animate-pulse" />
        <div className="mb-8">
          <div className="h-9 w-80 bg-[#0a0a0a] rounded mb-2 animate-pulse" />
          <div className="h-5 w-full max-w-xl bg-[#0a0a0a] rounded animate-pulse" />
        </div>
        <div className="space-y-6">
          <div className="flex justify-end">
            <div className="h-11 w-48 bg-[#0a0a0a] rounded-lg animate-pulse" />
          </div>
          <div className="bg-[#0a0a0a] rounded-xl  overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#0a0a0a] border-b border-white/10">
                  <tr>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <th key={i} className="px-6 py-3">
                        <div className="h-4 bg-[#0a0a0a] rounded animate-pulse" />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {[1, 2, 3].map((i) => (
                    <tr key={i}>
                      {[1, 2, 3, 4, 5].map((j) => (
                        <td key={j} className="px-6 py-4">
                          <div className="h-5 bg-[#0a0a0a] rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

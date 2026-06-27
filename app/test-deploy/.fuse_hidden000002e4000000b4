export default function TestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Deploy Test - {new Date().toISOString()}
        </h1>
        <p className="text-gray-600">
          If you see this page, the deployment is working.
        </p>
        <p className="text-sm text-gray-500 mt-4">
          Build ID: {process.env.VERCEL_GIT_COMMIT_SHA || 'local'}
        </p>
      </div>
    </div>
  )
}

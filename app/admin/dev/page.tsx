import Link from 'next/link'
import { AdminBreadcrumbs } from '@/components/admin/AdminBreadcrumbs'
import { Database, TestTube, Code } from 'lucide-react'


export default function DevToolsPage() {
  const tools = [
    {
      name: 'Database Debug',
      description: 'Inspect and debug Firestore database contents',
      href: '/admin/dev/debug-db',
      icon: Database,
      color: 'bg-blue-500'
    },
    {
      name: 'Test Data',
      description: 'Create test users, events, and other data for development',
      href: '/admin/dev/create-test-data',
      icon: TestTube,
      color: 'bg-green-500'
    },
    {
      name: 'Seed Events',
      description: 'Generate sample events for testing and development',
      href: '/admin/dev/seed-events',
      icon: Code,
      color: 'bg-purple-500'
    }
  ]

  return (
    <div className="p-6 space-y-6">
      <AdminBreadcrumbs 
        items={[
          { label: 'Dev Tools', href: '/admin/dev' }
        ]} 
      />

      <div>
        <h1 className="font-display text-2xl text-gray-900 mb-2">Development Tools</h1>
        <p className="text-gray-600">
          Tools for debugging, testing, and development. Only visible to authorized developers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="group bg-white rounded-lg border border-gray-200 p-6 hover:border-gray-300 hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-start space-x-4">
              <div className={`flex-shrink-0 ${tool.color} rounded-lg p-3`}>
                <tool.icon className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-medium text-gray-900 group-hover:text-blue-600">
                  {tool.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {tool.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Development Environment Only
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                These tools are only intended for development and testing. They should not be used in production environments.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
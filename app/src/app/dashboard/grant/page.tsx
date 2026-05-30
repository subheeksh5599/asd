import { GrantForm } from "@/components/GrantForm"

export default function GrantPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-6 py-10 bg-white rounded-2xl shadow-sm border border-gray-200 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Issue Capability</h2>
          <p className="text-sm text-gray-500 mt-1">Authorize an AI agent to act on your behalf with defined limits.</p>
        </div>
        <GrantForm />
      </div>
    </main>
  )
}

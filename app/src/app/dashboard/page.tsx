"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getSession } from "@/lib/zklogin"
import { fetchCapabilities } from "@/lib/agentpass"
import { CapabilityCard } from "@/components/CapabilityCard"
import type { Capability } from "@/lib/types"

function truncate(addr: string) { return `${addr.slice(0, 6)}...${addr.slice(-4)}` }

export default function DashboardPage() {
  const router = useRouter()
  const [address, setAddress] = useState<string | null>(null)
  const [caps, setCaps] = useState<Capability[]>([])
  const [loading, setLoading] = useState(true)

  async function load(addr: string) {
    setLoading(true)
    try {
      const data = await fetchCapabilities(addr)
      setCaps(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const session = getSession()
    if (!session) { router.replace("/"); return }
    setAddress(session.address)
    load(session.address)
  }, [router])

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AgentPass</h1>
            {address && <p className="text-sm text-gray-500 font-mono mt-0.5">{truncate(address)}</p>}
          </div>
          <button
            onClick={() => router.push("/dashboard/grant")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Issue New
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : caps.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">No capabilities issued yet.</p>
            <p className="text-sm mt-1">Issue one to authorize an AI agent.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {caps.map(cap => (
              <CapabilityCard key={cap.id} capability={cap} onRevoked={() => address && load(address)} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

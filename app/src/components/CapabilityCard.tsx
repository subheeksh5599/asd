"use client"
import { useState } from "react"
import { revokeCapability } from "@/lib/agentpass"
import type { Capability } from "@/lib/types"

function truncate(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function formatExpiry(ms: number) {
  if (ms === 0) return "Never"
  return new Date(ms).toLocaleDateString()
}

export function CapabilityCard({ capability, onRevoked }: { capability: Capability, onRevoked: () => void }) {
  const [revoking, setRevoking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRevoke() {
    setRevoking(true)
    setError(null)
    try {
      await revokeCapability(capability.id)
      onRevoked()
    } catch (e: any) {
      setError(e.message ?? "Revoke failed")
      setRevoking(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${capability.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
          {capability.status}
        </span>
        <span className="text-xs text-gray-400">Issued {new Date(capability.issuedAtMs).toLocaleDateString()}</span>
      </div>

      <div>
        <p className="text-xs text-gray-500">Agent</p>
        <p className="font-mono text-sm">{truncate(capability.agent)}</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {capability.scopes.map(s => (
          <span key={s} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-md font-mono">{s}</span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-xs text-gray-500">Max USDC</p>
          <p>{capability.maxUsdc === 0 ? "Unlimited" : `$${capability.maxUsdc}`}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Expires</p>
          <p>{formatExpiry(capability.expiryMs)}</p>
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {capability.status === "active" && (
        <button
          onClick={handleRevoke}
          disabled={revoking}
          className="w-full py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {revoking ? "Revoking..." : "Revoke"}
        </button>
      )}
    </div>
  )
}

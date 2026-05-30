"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { issueCapability } from "@/lib/agentpass"

const SCOPES = ["trade:deepbook", "stake:scallop", "lend:scallop"]
const EXPIRY_OPTIONS = [
  { label: "1 day", ms: 86_400_000 },
  { label: "7 days", ms: 604_800_000 },
  { label: "30 days", ms: 2_592_000_000 },
  { label: "Never", ms: 0 },
]

export function GrantForm() {
  const router = useRouter()
  const [agent, setAgent] = useState("")
  const [scopes, setScopes] = useState<string[]>([])
  const [maxUsdc, setMaxUsdc] = useState(0)
  const [leverageAllowed, setLeverageAllowed] = useState(false)
  const [expiresInMs, setExpiresInMs] = useState(604_800_000)
  const [loading, setLoading] = useState(false)
  const [digest, setDigest] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function toggleScope(s: string) {
    setScopes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!agent || scopes.length === 0) { setError("Agent address and at least one scope required"); return }
    setLoading(true)
    setError(null)
    try {
      const expiry = expiresInMs === 0 ? 0 : Date.now() + expiresInMs
      const txDigest = await issueCapability({ agent, scopes, maxUsdc, leverageAllowed, expiresInMs: expiry })
      setDigest(txDigest)
    } catch (e: any) {
      setError(e.message ?? "Failed to issue capability")
    } finally {
      setLoading(false)
    }
  }

  if (digest) return (
    <div className="space-y-4 text-center">
      <div className="text-green-600 text-lg font-semibold">Capability Issued!</div>
      <p className="text-sm text-gray-600">Tx: <span className="font-mono text-xs">{digest}</span></p>
      <button onClick={() => router.push("/dashboard")} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Back to Dashboard</button>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Agent Address</label>
        <input value={agent} onChange={e => setAgent(e.target.value)} placeholder="0x..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Scopes</label>
        <div className="space-y-2">
          {SCOPES.map(s => (
            <label key={s} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={scopes.includes(s)} onChange={() => toggleScope(s)} className="rounded" />
              <span className="font-mono text-sm">{s}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Max USDC (0 = unlimited)</label>
        <input type="number" min={0} value={maxUsdc} onChange={e => setMaxUsdc(Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={leverageAllowed} onChange={e => setLeverageAllowed(e.target.checked)} className="rounded" />
        <span className="text-sm font-medium text-gray-700">Allow leverage</span>
      </label>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Expires</label>
        <select value={expiresInMs} onChange={e => setExpiresInMs(Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          {EXPIRY_OPTIONS.map(o => <option key={o.label} value={o.ms}>{o.label}</option>)}
        </select>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button type="submit" disabled={loading} className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors">
        {loading ? "Issuing..." : "Issue Capability"}
      </button>
    </form>
  )
}

"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

interface AuditEntry { type: string; capId: string; agent: string; timestamp: number; txDigest: string; walrusBlobId: string }

export default function AuditPage() {
  const { agent } = useParams<{ agent: string }>()
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_INDEXER_URL ?? "http://localhost:3001"
    fetch(`${base}/audit/${agent}`)
      .then(r => { if (!r.ok) throw new Error(`Indexer returned ${r.status}`); return r.json() })
      .then(data => setEntries(data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [agent])

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        <h1 className="text-xl font-bold text-gray-900">Audit Log</h1>
        <p className="font-mono text-sm text-gray-500">{agent}</p>

        {loading && <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />}
        {error && <p className="text-red-500 text-sm">Indexer unavailable: {error}</p>}
        {!loading && !error && entries.length === 0 && <p className="text-gray-400">No audit entries found.</p>}

        <div className="space-y-3">
          {entries.map((e, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${e.type === "issued" ? "bg-green-100 text-green-700" : e.type === "revoked" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-700"}`}>{e.type}</span>
                <span className="text-xs text-gray-400">{new Date(e.timestamp).toLocaleString()}</span>
              </div>
              <p className="text-xs font-mono text-gray-500 truncate">tx: {e.txDigest}</p>
              {e.walrusBlobId && <p className="text-xs font-mono text-gray-400 truncate">walrus: {e.walrusBlobId}</p>}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

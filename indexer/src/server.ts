import { getEntries } from "./store.js"
import { readAuditBlob } from "./walrus.js"

export function startServer(port = 3001): void {
  Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url)

      const headers = {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      }

      if (req.method === "OPTIONS") return new Response(null, { headers })

      if (url.pathname === "/health") {
        return new Response(JSON.stringify({ ok: true }), { headers })
      }

      const auditMatch = url.pathname.match(/^\/audit\/(.+)$/)
      if (auditMatch) {
        const agentAddress = auditMatch[1]
        const entries = getEntries(agentAddress)
        const enriched = await Promise.all(
          entries.slice(0, 50).map(async (entry) => {
            let data: unknown = null
            try {
              data = await readAuditBlob(entry.blobId)
            } catch {}
            return { ...entry, data }
          }),
        )
        return new Response(JSON.stringify(enriched), { headers })
      }

      return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers })
    },
  })
  console.log(`Indexer HTTP API on http://localhost:${port}`)
}

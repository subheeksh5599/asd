// Reads and writes immutable audit blobs via the Walrus HTTP API (testnet).

const PUBLISHER = "https://publisher.walrus-testnet.walrus.space/v1/blobs"
const AGGREGATOR = "https://aggregator.walrus-testnet.walrus.space/v1/blobs"

export async function writeAuditBlob(data: unknown): Promise<string> {
  const body = JSON.stringify({ ...(data as object), indexedAt: Date.now() })
  const response = await fetch(PUBLISHER, {
    method: "PUT",
    body,
    headers: { "Content-Type": "application/json" },
  })
  if (!response.ok) {
    throw new Error(`Walrus write failed: ${response.status} ${await response.text()}`)
  }
  const result = (await response.json()) as {
    newlyCreated?: { blobObject: { blobId: string } }
    alreadyCertified?: { blobId: string }
  }
  return result.newlyCreated?.blobObject.blobId ?? result.alreadyCertified?.blobId ?? ""
}

export async function readAuditBlob(blobId: string): Promise<unknown> {
  const response = await fetch(`${AGGREGATOR}/${blobId}`)
  if (!response.ok) {
    throw new Error(`Walrus read failed: ${response.status}`)
  }
  return response.json()
}

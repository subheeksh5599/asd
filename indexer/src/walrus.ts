// Writes Sui events as immutable blobs to Walrus

export async function writeAuditBlob(event: unknown): Promise<string> {
  const blob = JSON.stringify({
    ...event as object,
    indexedAt: Date.now(),
  })

  // TODO: use @mysten/walrus SDK to store blob
  // const client = new WalrusClient({ network: ... })
  // const { blobId } = await client.store(Buffer.from(blob))
  // return blobId

  console.log("Would write blob:", blob.slice(0, 120))
  return "placeholder-blob-id"
}

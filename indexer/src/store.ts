import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs"

const DATA_DIR = "./data"
const INDEX_FILE = `${DATA_DIR}/audit-index.json`

export interface IndexEntry {
  blobId: string
  eventType: string
  timestamp: number
  txDigest: string
}

interface AuditIndex {
  [agentAddress: string]: IndexEntry[]
}

export function loadIndex(): AuditIndex {
  if (!existsSync(INDEX_FILE)) return {}
  try {
    return JSON.parse(readFileSync(INDEX_FILE, "utf-8"))
  } catch {
    return {}
  }
}

export function saveIndex(index: AuditIndex): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2))
}

export function addEntry(agentAddress: string, entry: IndexEntry): void {
  const index = loadIndex()
  if (!index[agentAddress]) index[agentAddress] = []
  index[agentAddress].unshift(entry)
  saveIndex(index)
}

export function getEntries(agentAddress: string): IndexEntry[] {
  return loadIndex()[agentAddress] ?? []
}

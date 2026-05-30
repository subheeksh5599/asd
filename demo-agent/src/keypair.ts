import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography"
import { config } from "./config.js"

export function loadKeypair(): Ed25519Keypair {
  if (!config.agentPrivateKey) throw new Error("AGENT_PRIVATE_KEY not set")

  const raw = config.agentPrivateKey.trim()

  // Form 1: bech32 `suiprivkey1...` (Sui CLI / wallet export).
  if (raw.startsWith("suiprivkey1")) {
    return Ed25519Keypair.fromSecretKey(raw)
  }

  const bytes = Buffer.from(raw, "base64")

  // Form 2: base64 of a bech32 string. `getSecretKey()` returns the
  // `suiprivkey1...` string, so a naive base64 of it decodes back to that text.
  const asText = bytes.toString("utf8")
  if (asText.startsWith("suiprivkey1")) {
    return Ed25519Keypair.fromSecretKey(asText)
  }

  // Form 3: raw base64 secret key. 32 bytes, or 33 with a leading scheme flag.
  const secret = bytes.length === 33 ? bytes.subarray(1) : bytes
  if (secret.length !== 32) {
    throw new Error(
      `AGENT_PRIVATE_KEY decoded to ${secret.length} bytes, expected 32. ` +
        `Generate one with: bun run keygen`,
    )
  }
  return Ed25519Keypair.fromSecretKey(new Uint8Array(secret))
}

// Run: bun src/keygen.ts
export function generateKeypair(): void {
  const kp = new Ed25519Keypair()
  // getSecretKey() returns the bech32 `suiprivkey1...` form. Decode it to the
  // raw 32-byte secret so the env value is honest base64 of the secret key.
  const { secretKey } = decodeSuiPrivateKey(kp.getSecretKey())
  console.log("Address:", kp.toSuiAddress())
  console.log("Private key (base64):", Buffer.from(secretKey).toString("base64"))
  console.log("Set AGENT_PRIVATE_KEY to the private key above")
}

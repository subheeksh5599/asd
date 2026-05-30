"use client"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { generateNonce, generateRandomness, getZkLoginSignature, jwtToAddress, genAddressSeed } from "@mysten/zklogin"
import { Transaction } from "@mysten/sui/transactions"
import { suiClient } from "./sui"
import type { ZkLoginSession } from "./types"

const SESSION_KEY = "agentpass_session"
const INIT_KEY = "agentpass_zklogin_init"
const PROVER_URL = "https://prover-dev.mystenlabs.com/v1"

export async function initZkLogin(): Promise<string> {
  const ephemeralKeyPair = new Ed25519Keypair()
  const { epoch } = await suiClient.getLatestSuiSystemState()
  const maxEpoch = Number(epoch) + 2
  const randomness = generateRandomness()
  const nonce = generateNonce(ephemeralKeyPair.getPublicKey(), maxEpoch, randomness)

  sessionStorage.setItem(INIT_KEY, JSON.stringify({
    ephemeralPrivateKey: Buffer.from(ephemeralKeyPair.getSecretKey()).toString("base64"),
    maxEpoch,
    randomness,
  }))

  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
    redirect_uri: `${window.location.origin}/auth/callback`,
    response_type: "id_token",
    scope: "openid",
    nonce,
    prompt: "select_account",
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export async function completeZkLogin(jwt: string): Promise<ZkLoginSession> {
  const initRaw = sessionStorage.getItem(INIT_KEY)
  if (!initRaw) throw new Error("No zkLogin init state found")
  const { ephemeralPrivateKey, maxEpoch, randomness } = JSON.parse(initRaw)

  // Decode JWT payload
  const payload = JSON.parse(atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")))
  const sub: string = payload.sub
  const aud: string = Array.isArray(payload.aud) ? payload.aud[0] : payload.aud

  // Deterministic salt from sub
  const userSalt = (BigInt(sub.replace(/\D/g, "").slice(0, 18) || "12345") % BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617")).toString()

  // Rebuild ephemeral keypair to get public key for prover
  const ephemeralKeyPair = Ed25519Keypair.fromSecretKey(Buffer.from(ephemeralPrivateKey, "base64"))

  const proverResponse = await fetch(PROVER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jwt,
      extendedEphemeralPublicKey: ephemeralKeyPair.getPublicKey().toSuiPublicKey(),
      maxEpoch,
      jwtRandomness: randomness,
      salt: userSalt,
      keyClaimName: "sub",
    }),
  })
  if (!proverResponse.ok) throw new Error(`ZK prover failed: ${proverResponse.status}`)
  const zkProof = await proverResponse.json()

  const address = jwtToAddress(jwt, userSalt)

  const session: ZkLoginSession = { address, ephemeralPrivateKey, zkProof, maxEpoch, randomness, userSalt }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  sessionStorage.removeItem(INIT_KEY)
  return session
}

export function getSession(): ZkLoginSession | null {
  if (typeof window === "undefined") return null
  const raw = sessionStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(INIT_KEY)
}

export async function signAndExecuteTx(tx: Transaction): Promise<{ digest: string }> {
  const session = getSession()
  if (!session) throw new Error("Not logged in")

  const ephemeralKeyPair = Ed25519Keypair.fromSecretKey(Buffer.from(session.ephemeralPrivateKey, "base64"))
  tx.setSender(session.address)

  const { bytes, signature: userSignature } = await tx.sign({ client: suiClient, signer: ephemeralKeyPair })

  // Decode JWT stored in zkProof to get sub+aud for addressSeed
  // sub is in the zkProof inputs from the prover
  const zkProof = session.zkProof as any
  const addressSeed = genAddressSeed(BigInt(session.userSalt), "sub", zkProof.claims?.[0]?.value ?? "", process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "").toString()

  const zkLoginSignature = getZkLoginSignature({
    inputs: { ...zkProof, addressSeed },
    maxEpoch: session.maxEpoch,
    userSignature,
  })

  const result = await suiClient.executeTransactionBlock({
    transactionBlock: bytes,
    signature: zkLoginSignature,
    options: { showEffects: true },
  })
  return { digest: result.digest }
}

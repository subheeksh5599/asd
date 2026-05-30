"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSession } from "@/lib/zklogin"
import { ZkLoginButton } from "@/components/ZkLoginButton"

export default function HomePage() {
  const router = useRouter()
  useEffect(() => {
    if (getSession()) router.replace("/dashboard")
  }, [router])

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-6 text-center space-y-8">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-gray-900">AgentPass</h1>
          <p className="text-gray-500 text-lg">OAuth for AI agents on Sui. Issue scoped, revocable permissions to autonomous agents — backed by zkLogin identity and Walrus audit trails.</p>
        </div>
        <ZkLoginButton />
        <p className="text-xs text-gray-400">Sui Overflow 2026 · Agentic Web · Walrus · DeepBook</p>
      </div>
    </main>
  )
}

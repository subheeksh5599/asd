"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { completeZkLogin } from "@/lib/zklogin"

export default function CallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function finish() {
      try {
        // id_token is in the URL fragment
        const hash = window.location.hash.slice(1)
        const params = new URLSearchParams(hash)
        const jwt = params.get("id_token")
        if (!jwt) throw new Error("No id_token in callback URL")
        await completeZkLogin(jwt)
        router.replace("/dashboard")
      } catch (e: any) {
        setError(e.message ?? "Login failed")
      }
    }
    finish()
  }, [router])

  if (error) return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <p className="text-red-500 font-medium">Login failed: {error}</p>
        <a href="/" className="text-blue-600 text-sm underline">Try again</a>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-600">Completing login...</p>
      </div>
    </main>
  )
}

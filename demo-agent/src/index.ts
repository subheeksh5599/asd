import { runAgent } from "./agent.js"

runAgent().catch((err) => {
  console.error("Fatal:", err.message)
  process.exit(1)
})

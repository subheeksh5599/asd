import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Worktree lives inside the parent repo, so Next detects multiple lockfiles.
  // The inferred root warning is harmless; the build resolves packages correctly
  // from this app directory's own node_modules.
};

export default nextConfig;

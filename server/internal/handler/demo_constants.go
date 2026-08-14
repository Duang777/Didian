package handler

// Demo mode constants used by /auth/demo and seed data.
// These identify a single demo user + workspace that are created by
// the seed process when the server starts with DEMO_MODE=true (or
// the --demo flag). The same constants are expected by the Chrome
// extension (apps/extension/src/background.ts).
const (
	demoEmail         = "demo@didian.ai"
	demoUserName      = "Demo User"
	demoWorkspaceName = "Didian 演示工作区"
	demoWorkspaceSlug = "didian-submission-demo"
)
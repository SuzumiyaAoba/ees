#!/usr/bin/env node

import { spawn } from "node:child_process"
import { writeFileSync } from "node:fs"
import { getPort } from "get-port-please"

const DEFAULT_API_PORT = 3000
const DEFAULT_WEB_PORT = 5173
const API_PORT_RANGE = [3000, 3100]
const WEB_PORT_RANGE = [5173, 5273]

async function findAvailablePorts() {
	const apiPort = await getPort({
		port: DEFAULT_API_PORT,
		portRange: API_PORT_RANGE,
	})

	const webPort = await getPort({
		port: DEFAULT_WEB_PORT,
		portRange: WEB_PORT_RANGE,
	})

	return { apiPort, webPort }
}

function updateWebEnv(apiPort) {
	const envContent = `VITE_API_URL=http://localhost:${apiPort}\n`
	writeFileSync("packages/web/.env.local", envContent)
	console.log(
		`\n✓ Updated packages/web/.env.local with API URL: http://localhost:${apiPort}\n`,
	)
}

function startProcess(command, args, env, name) {
	const proc = spawn(command, args, {
		env: { ...process.env, ...env },
		stdio: "inherit",
		shell: true,
	})

	proc.on("error", (error) => {
		console.error(`Failed to start ${name}:`, error)
		process.exit(1)
	})

	return proc
}

async function main() {
	try {
		const { apiPort, webPort } = await findAvailablePorts()

		console.log(`\n🚀 Starting development servers...`)
		console.log(`   API Server: http://localhost:${apiPort}`)
		console.log(`   Web UI: http://localhost:${webPort}\n`)

		updateWebEnv(apiPort)

		const apiProcess = startProcess(
			"npm",
			["run", "dev", "--workspace=@ees/api"],
			{ PORT: apiPort.toString() },
			"API Server",
		)

		const webProcess = startProcess(
			"npm",
			["run", "dev", "--workspace=packages/web"],
			{ PORT: webPort.toString() },
			"Web UI",
		)

		const cleanup = () => {
			console.log("\n\n🛑 Shutting down development servers...")
			apiProcess.kill()
			webProcess.kill()
			process.exit(0)
		}

		process.on("SIGINT", cleanup)
		process.on("SIGTERM", cleanup)

		apiProcess.on("exit", (code) => {
			console.error(`\nAPI Server exited with code ${code}`)
			webProcess.kill()
			process.exit(code || 1)
		})

		webProcess.on("exit", (code) => {
			console.error(`\nWeb UI exited with code ${code}`)
			apiProcess.kill()
			process.exit(code || 1)
		})
	} catch (error) {
		console.error("Failed to start development servers:", error)
		process.exit(1)
	}
}

main()

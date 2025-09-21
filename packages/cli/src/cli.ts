#!/usr/bin/env node

/**
 * CLI Entry Point for EES (Embeddings Service)
 *
 * Command-line interface using CAC for parsing and the core EES business logic
 */

import { cac } from "cac"
import { Effect } from "effect"
import { createCLICommands, runCLICommand } from "./index.js"

const cli = cac("ees")

async function main() {
  const commands = await Effect.runPromise(createCLICommands())

  // Create embedding command
  cli
    .command("create <uri>", "Create embedding from text")
    .option("-t, --text <text>", "Text content to embed")
    .option("-f, --file <file>", "Read text from file")
    .option("-m, --model <model>", "Model name for embedding")
    .action(async (uri: string, options: any) => {
      await runCLICommand(
        commands.create({
          uri,
          text: options.text,
          file: options.file,
          model: options.model,
        })
      )
    })

  // Batch create embeddings command
  cli
    .command("batch <file>", "Create multiple embeddings from batch file")
    .option("-m, --model <model>", "Model name for embeddings")
    .action(async (file: string, options: any) => {
      await runCLICommand(
        commands.batch({
          file,
          model: options.model,
        })
      )
    })

  // Search embeddings command
  cli
    .command("search <query>", "Search for similar embeddings")
    .option("-m, --model <model>", "Model name to search in")
    .option("-l, --limit <limit>", "Maximum number of results", { default: 10 })
    .option("-t, --threshold <threshold>", "Similarity threshold", {
      default: 0.0,
    })
    .option(
      "--metric <metric>",
      "Distance metric (cosine, euclidean, dot_product)",
      { default: "cosine" }
    )
    .action(async (query: string, options: any) => {
      await runCLICommand(
        commands.search({
          query,
          model: options.model,
          limit: Number.parseInt(options.limit, 10),
          threshold: Number.parseFloat(options.threshold),
          metric: options.metric,
        })
      )
    })

  // List embeddings command
  cli
    .command("list", "List all embeddings")
    .option("-u, --uri <uri>", "Filter by URI pattern")
    .option("-m, --model <model>", "Filter by model name")
    .option("-p, --page <page>", "Page number", { default: 1 })
    .option("-l, --limit <limit>", "Items per page", { default: 10 })
    .action(async (options: any) => {
      await runCLICommand(
        commands.list({
          uri: options.uri,
          model: options.model,
          page: Number.parseInt(options.page, 10),
          limit: Number.parseInt(options.limit, 10),
        })
      )
    })

  // Get embedding command
  cli
    .command("get <uri>", "Get embedding by URI")
    .action(async (uri: string) => {
      await runCLICommand(commands.get({ uri }))
    })

  // Delete embedding command
  cli
    .command("delete <id>", "Delete embedding by ID")
    .action(async (id: string) => {
      await runCLICommand(
        commands.delete({ id: Number.parseInt(id, 10) })
      )
    })

  // Models command
  cli
    .command("models", "List available models")
    .action(async () => {
      await runCLICommand(commands.models())
    })

  // Upload command
  cli
    .command("upload <files...>", "Upload files and create embeddings")
    .option("-m, --model <model>", "Model name for embeddings")
    .action(async (files: string[], options: any) => {
      await runCLICommand(
        commands.upload({
          files,
          model: options.model,
        })
      )
    })

  // Migrate command
  cli
    .command("migrate <fromModel> <toModel>", "Migrate embeddings between models")
    .option("--dry-run", "Perform a dry run without actual migration")
    .action(async (fromModel: string, toModel: string, options: any) => {
      await runCLICommand(
        commands.migrate({
          fromModel,
          toModel,
          dryRun: options.dryRun,
        })
      )
    })

  // Providers command with subcommands
  cli
    .command("providers <action>", "Provider management")
    .option("-p, --provider <provider>", "Filter by provider name")
    .action(async (action: string, options: any) => {
      const validActions = ["list", "current", "models", "ollama-status"]
      if (!validActions.includes(action)) {
        console.error(`Invalid action: ${action}. Valid actions: ${validActions.join(", ")}`)
        process.exit(1)
      }

      await runCLICommand(
        commands.providers({
          action: action as "list" | "current" | "models" | "ollama-status",
          provider: options.provider,
        })
      )
    })

  // Global options
  cli.help()
  cli.version("1.0.0")

  // Parse CLI arguments
  cli.parse()
}

main().catch((error) => {
  console.error("CLI Error:", error)
  process.exit(1)
})
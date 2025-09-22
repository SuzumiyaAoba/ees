#!/usr/bin/env node

/**
 * CLI Entry Point for EES (Embeddings Service)
 *
 * Command-line interface using citty for parsing and the core EES business logic
 */

import { defineCommand, runMain } from "citty"
import { Effect } from "effect"
import { createCLICommands, runCLICommand } from "./index.js"

// Create sub-commands
const createCommand = defineCommand({
  meta: {
    name: "create",
    description: "Create embedding from text",
  },
  args: {
    uri: {
      type: "positional",
      description: "URI for the embedding",
      required: true,
    },
    text: {
      type: "string",
      alias: "t",
      description: "Text content to embed",
    },
    file: {
      type: "string",
      alias: "f",
      description: "Read text from file",
    },
    model: {
      type: "string",
      alias: "m",
      description: "Model name for embedding",
    },
  },
  async run({ args }) {
    const commands = await Effect.runPromise(createCLICommands())
    await runCLICommand(
      commands.create({
        uri: args.uri,
        text: args.text,
        file: args.file,
        model: args.model,
      })
    )
  },
})

const batchCommand = defineCommand({
  meta: {
    name: "batch",
    description: "Create multiple embeddings from batch file",
  },
  args: {
    file: {
      type: "positional",
      description: "Batch file path",
      required: true,
    },
    model: {
      type: "string",
      alias: "m",
      description: "Model name for embeddings",
    },
  },
  async run({ args }) {
    const commands = await Effect.runPromise(createCLICommands())
    await runCLICommand(
      commands.batch({
        file: args.file,
        model: args.model,
      })
    )
  },
})

const searchCommand = defineCommand({
  meta: {
    name: "search",
    description: "Search for similar embeddings",
  },
  args: {
    query: {
      type: "positional",
      description: "Search query text",
      required: true,
    },
    model: {
      type: "string",
      alias: "m",
      description: "Model name to search in",
    },
    limit: {
      type: "string",
      alias: "l",
      description: "Maximum number of results",
      default: "10",
    },
    threshold: {
      type: "string",
      alias: "t",
      description: "Similarity threshold",
      default: "0.0",
    },
    metric: {
      type: "string",
      description: "Distance metric (cosine, euclidean, dot_product)",
      default: "cosine",
    },
  },
  async run({ args }) {
    const commands = await Effect.runPromise(createCLICommands())
    await runCLICommand(
      commands.search({
        query: args.query,
        model: args.model,
        limit: Number.parseInt(args.limit, 10),
        threshold: Number.parseFloat(args.threshold),
        metric: args.metric as "cosine" | "euclidean" | "dot_product",
      })
    )
  },
})

const listCommand = defineCommand({
  meta: {
    name: "list",
    description: "List all embeddings",
  },
  args: {
    uri: {
      type: "string",
      alias: "u",
      description: "Filter by URI pattern",
    },
    model: {
      type: "string",
      alias: "m",
      description: "Filter by model name",
    },
    page: {
      type: "string",
      alias: "p",
      description: "Page number",
      default: "1",
    },
    limit: {
      type: "string",
      alias: "l",
      description: "Items per page",
      default: "10",
    },
  },
  async run({ args }) {
    const commands = await Effect.runPromise(createCLICommands())
    await runCLICommand(
      commands.list({
        uri: args.uri,
        model: args.model,
        page: Number.parseInt(args.page, 10),
        limit: Number.parseInt(args.limit, 10),
      })
    )
  },
})

const getCommand = defineCommand({
  meta: {
    name: "get",
    description: "Get embedding by URI",
  },
  args: {
    uri: {
      type: "positional",
      description: "URI of the embedding",
      required: true,
    },
  },
  async run({ args }) {
    const commands = await Effect.runPromise(createCLICommands())
    await runCLICommand(commands.get({ uri: args.uri }))
  },
})

const deleteCommand = defineCommand({
  meta: {
    name: "delete",
    description: "Delete embedding by ID",
  },
  args: {
    id: {
      type: "positional",
      description: "ID of the embedding to delete",
      required: true,
    },
  },
  async run({ args }) {
    const commands = await Effect.runPromise(createCLICommands())
    await runCLICommand(
      commands.delete({ id: Number.parseInt(args.id, 10) })
    )
  },
})

const modelsCommand = defineCommand({
  meta: {
    name: "models",
    description: "List available models",
  },
  async run() {
    const commands = await Effect.runPromise(createCLICommands())
    await runCLICommand(commands.models())
  },
})

const uploadCommand = defineCommand({
  meta: {
    name: "upload",
    description: "Upload files and create embeddings",
  },
  args: {
    files: {
      type: "positional",
      description: "Files to upload",
      required: true,
    },
    model: {
      type: "string",
      alias: "m",
      description: "Model name for embeddings",
    },
  },
  async run({ args }) {
    const commands = await Effect.runPromise(createCLICommands())
    const files = Array.isArray(args.files) ? args.files as string[] : [args.files as string]
    await runCLICommand(
      commands.upload({
        files,
        model: args.model,
      })
    )
  },
})

const migrateCommand = defineCommand({
  meta: {
    name: "migrate",
    description: "Migrate embeddings between models",
  },
  args: {
    fromModel: {
      type: "positional",
      description: "Source model name",
      required: true,
    },
    toModel: {
      type: "positional",
      description: "Target model name",
      required: true,
    },
    "dry-run": {
      type: "boolean",
      description: "Perform a dry run without actual migration",
    },
  },
  async run({ args }) {
    const commands = await Effect.runPromise(createCLICommands())
    await runCLICommand(
      commands.migrate({
        fromModel: args.fromModel,
        toModel: args.toModel,
        dryRun: args["dry-run"],
      })
    )
  },
})

const providersCommand = defineCommand({
  meta: {
    name: "providers",
    description: "Provider management",
  },
  args: {
    action: {
      type: "positional",
      description: "Action to perform (list, current, models, ollama-status)",
      required: true,
    },
    provider: {
      type: "string",
      alias: "p",
      description: "Filter by provider name",
    },
  },
  async run({ args }) {
    const validActions = ["list", "current", "models", "ollama-status"]
    if (!validActions.includes(args.action)) {
      console.error(`Invalid action: ${args.action}. Valid actions: ${validActions.join(", ")}`)
      process.exit(1)
    }

    const commands = await Effect.runPromise(createCLICommands())
    await runCLICommand(
      commands.providers({
        action: args.action as "list" | "current" | "models" | "ollama-status",
        provider: args.provider,
      })
    )
  },
})

// Main command
const main = defineCommand({
  meta: {
    name: "ees",
    version: "1.0.0",
    description: "EES (Embeddings Service) - Command-line interface for embedding operations",
  },
  subCommands: {
    create: createCommand,
    batch: batchCommand,
    search: searchCommand,
    list: listCommand,
    get: getCommand,
    delete: deleteCommand,
    models: modelsCommand,
    upload: uploadCommand,
    migrate: migrateCommand,
    providers: providersCommand,
  },
})

// Run the CLI
runMain(main)
export * from "./application"
export * from "./cache"
export * from "./config"
export * from "./database"
export * from "./errors"
export * from "./models"
export * from "./providers"

// Export lib module with explicit re-export to avoid naming conflicts
export {
  getPort,
  getEnv,
  getEnvWithDefault,
  getEnvNumber,
  getEnvBoolean,
  isTestEnv,
  log,
  error,
  parseBatchFile,
  readStdin,
  readTextFile,
  processFile,
  processFiles,
  type FileProcessorError,
  type FileProcessingResult,
  UnsupportedFileTypeError,
  FileProcessingError,
  FileTooLargeError,
} from "./lib"

// Export file processing utilities
export {
  parseIgnorePatterns,
  loadEesignore,
  getDefaultIgnorePatterns,
  shouldIgnore,
} from "./file-processing/eesignore"

export {
  collectFilesFromDirectory,
  filterByExtension,
  filterBySize,
  type DirectoryProcessOptions,
  type CollectedFile,
} from "./file-processing/directory-processor"

// Export environment variable keys
export { ENV_KEYS } from "./config/env-keys"

// Export observability module (keeping the Effect-based log for Effect code)
export * from "./observability"

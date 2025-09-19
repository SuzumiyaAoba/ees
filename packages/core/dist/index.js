// Temporary stub build - re-exports from TypeScript source
// This allows the API package to import @ees/core during testing
// while avoiding TypeScript compilation errors

export * from '../src/shared/index';
export { EmbeddingService } from '../src/entities/embedding/index';
/**
 * E2E Test Setup
 * Sets environment variables before any modules are imported
 */

// Set NODE_ENV to test before any imports
process.env["NODE_ENV"] = "test"
process.env["EES_DATABASE_URL"] = ":memory:"

/**
 * Simple E2E Test to verify basic functionality
 */

import { describe, it, expect } from "vitest"
import app from "@/app"

describe("Simple E2E Test", () => {
  it("should return health check response", async () => {
    const response = await app.request("/")

    expect(response.status).toBe(200)
    const text = await response.text()
    expect(text).toBe("EES - Embeddings API Service")
  })

  it("should serve OpenAPI documentation", async () => {
    const response = await app.request("/openapi.json")

    expect(response.status).toBe(200)
    const spec = await response.json()
    expect(spec).toHaveProperty("openapi")
    expect(spec).toHaveProperty("info")
  })

  it("should serve Swagger UI", async () => {
    const response = await app.request("/docs")

    expect(response.status).toBe(200)
    const html = await response.text()
    expect(html).toContain("swagger-ui")
  })
})
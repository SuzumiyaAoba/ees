import { describe, expect, it } from "vitest"
import app from "@/index"

describe("Hono app", () => {
  it("should return service name for root path", async () => {
    const res = await app.request("/")
    expect(res.status).toBe(200)
    expect(await res.text()).toBe("EES - Embeddings API Service")
  })
})

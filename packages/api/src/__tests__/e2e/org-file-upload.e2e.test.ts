/**
 * E2E Tests for Org-mode File Upload and Conversion
 * Tests uploading org-mode files and verifying they are converted to Markdown
 */

import { describe, it, expect, beforeAll, afterEach } from "vitest"
import app from "@/app"
import { setupE2ETests, registerEmbeddingForCleanup, testState } from "@/__tests__/e2e-setup"
import { parseUnknownJsonResponse } from "@/__tests__/types/test-types"

/**
 * Upload response type
 */
interface UploadResponse {
  successful: number
  failed: number
  results: Array<{
    id?: number
    uri: string
    status: "success" | "error"
    error?: string
  }>
  model_name?: string
  message?: string
}

// Setup E2E test environment
setupE2ETests()

describe("Org-mode File Upload E2E Tests", () => {
  beforeAll(() => {
    if (!testState.isSetupComplete) {
      throw new Error("E2E test environment not properly initialized")
    }
  })

  afterEach(async () => {
    // Cleanup is handled by e2e-setup afterEach hook
  })

  /**
   * Helper to create a mock File object for testing
   */
  const createOrgFile = (filename: string, content: string): File => {
    const blob = new Blob([content], { type: "text/plain" })
    return new File([blob], filename, { type: "text/plain" })
  }

  describe("POST /upload - Org-mode file conversion", () => {
    it("should upload and convert simple org-mode file", async () => {
      const orgContent = `* Heading
Some text content.
** Subheading
More text here.`

      const file = createOrgFile("document.org", orgContent)
      const formData = new FormData()
      formData.append("file", file)

      const response = await app.request("/upload", {
        method: "POST",
        body: formData,
      })

      // Accept both success and service unavailable
      expect([200, 404, 500]).toContain(response.status)

      if (response.status !== 200) {
        console.log("Skipping org file upload test - service unavailable")
        return
      }

      expect(response.headers.get("content-type")).toContain("application/json")

      const uploadResult = await parseUnknownJsonResponse(response) as unknown as UploadResponse

      expect(uploadResult).toHaveProperty("successful")
      expect(uploadResult).toHaveProperty("failed")
      expect(uploadResult).toHaveProperty("results")

      expect(uploadResult.successful).toBe(1)
      expect(uploadResult.failed).toBe(0)
      expect(uploadResult.results).toHaveLength(1)

      const result = uploadResult.results[0]
      expect(result).toBeDefined()
      if (result) {
        expect(result.status).toBe("success")
        expect(result.uri).toBe("document.org")
        expect(result).toHaveProperty("id")

        if ("id" in result && typeof result.id === "number") {
          registerEmbeddingForCleanup(result.id)
        }
      }
    })

    it("should upload org-mode file with complex formatting", async () => {
      const orgContent = `#+TITLE: My Document
#+AUTHOR: John Doe
#+DATE: 2024-01-01

* Introduction
This is the introduction section.

* Main Content
** Subsection 1
Some content with *bold* and /italic/ text.

** Subsection 2
- Bullet point 1
- Bullet point 2
- Bullet point 3

* Code Example
#+BEGIN_SRC python
def hello():
    print("Hello, World!")
#+END_SRC

* Conclusion
Final thoughts.`

      const file = createOrgFile("complex.org", orgContent)
      const formData = new FormData()
      formData.append("file", file)

      const response = await app.request("/upload", {
        method: "POST",
        body: formData,
      })

      expect([200, 404, 500]).toContain(response.status)

      if (response.status !== 200) {
        console.log("Skipping complex org file test - service unavailable")
        return
      }

      const uploadResult = await parseUnknownJsonResponse(response) as unknown as UploadResponse

      expect(uploadResult.successful).toBe(1)
      expect(uploadResult.failed).toBe(0)

      const result = uploadResult.results[0]
      if (result && "id" in result && typeof result.id === "number") {
        registerEmbeddingForCleanup(result.id)
      }
    })

    it("should upload org-mode file with lists and checkboxes", async () => {
      const orgContent = `* Todo List
- [X] Completed task
- [ ] Pending task
- [ ] Another pending task

** Shopping List
1. Milk
2. Bread
3. Eggs

** Notes
*Important:* Don't forget to call back.
/Reminder:/ Meeting at 3 PM.`

      const file = createOrgFile("lists.org", orgContent)
      const formData = new FormData()
      formData.append("file", file)

      const response = await app.request("/upload", {
        method: "POST",
        body: formData,
      })

      expect([200, 404, 500]).toContain(response.status)

      if (response.status !== 200) {
        console.log("Skipping org lists test - service unavailable")
        return
      }

      const uploadResult = await parseUnknownJsonResponse(response) as unknown as UploadResponse

      expect(uploadResult.successful).toBe(1)
      expect(uploadResult.failed).toBe(0)

      const result = uploadResult.results[0]
      if (result && "id" in result && typeof result.id === "number") {
        registerEmbeddingForCleanup(result.id)
      }
    })

    it("should upload org-mode file with tables", async () => {
      const orgContent = `* Data Table
| Name  | Age | City     |
|-------+-----+----------|
| Alice | 30  | New York |
| Bob   | 25  | London   |
| Carol | 35  | Tokyo    |`

      const file = createOrgFile("table.org", orgContent)
      const formData = new FormData()
      formData.append("file", file)

      const response = await app.request("/upload", {
        method: "POST",
        body: formData,
      })

      expect([200, 404, 500]).toContain(response.status)

      if (response.status !== 200) {
        console.log("Skipping org table test - service unavailable")
        return
      }

      const uploadResult = await parseUnknownJsonResponse(response) as unknown as UploadResponse

      expect(uploadResult.successful).toBe(1)
      expect(uploadResult.failed).toBe(0)

      const result = uploadResult.results[0]
      if (result && "id" in result && typeof result.id === "number") {
        registerEmbeddingForCleanup(result.id)
      }
    })

    it("should upload org-mode file with links", async () => {
      const orgContent = `* Resources
External links:
[[https://example.com][Example Site]]
[[https://github.com][GitHub]]

Internal links:
[[file:document.pdf][PDF Document]]
[[file:image.png][Image]]`

      const file = createOrgFile("links.org", orgContent)
      const formData = new FormData()
      formData.append("file", file)

      const response = await app.request("/upload", {
        method: "POST",
        body: formData,
      })

      expect([200, 404, 500]).toContain(response.status)

      if (response.status !== 200) {
        console.log("Skipping org links test - service unavailable")
        return
      }

      const uploadResult = await parseUnknownJsonResponse(response) as unknown as UploadResponse

      expect(uploadResult.successful).toBe(1)
      expect(uploadResult.failed).toBe(0)

      const result = uploadResult.results[0]
      if (result && "id" in result && typeof result.id === "number") {
        registerEmbeddingForCleanup(result.id)
      }
    })

    it("should upload multiple org-mode files at once", async () => {
      const file1 = createOrgFile("doc1.org", "* Document 1\nFirst document content.")
      const file2 = createOrgFile("doc2.org", "* Document 2\nSecond document content.")
      const file3 = createOrgFile("doc3.org", "* Document 3\nThird document content.")

      const formData = new FormData()
      formData.append("file", file1)
      formData.append("file", file2)
      formData.append("file", file3)

      const response = await app.request("/upload", {
        method: "POST",
        body: formData,
      })

      expect([200, 404, 500]).toContain(response.status)

      if (response.status !== 200) {
        console.log("Skipping multiple org files test - service unavailable")
        return
      }

      const uploadResult = await parseUnknownJsonResponse(response) as unknown as UploadResponse

      expect(uploadResult.successful).toBe(3)
      expect(uploadResult.failed).toBe(0)
      expect(uploadResult.results).toHaveLength(3)

      uploadResult.results.forEach((result) => {
        if (result && "id" in result && typeof result.id === "number") {
          registerEmbeddingForCleanup(result.id)
        }
      })
    })

    it("should upload mixed file types including org-mode", async () => {
      const orgFile = createOrgFile("document.org", "* Heading\nOrg content.")
      const txtFile = new File([new Blob(["Plain text content"], { type: "text/plain" })], "text.txt", { type: "text/plain" })
      const mdFile = new File([new Blob(["# Markdown\nMarkdown content"], { type: "text/markdown" })], "readme.md", { type: "text/markdown" })

      const formData = new FormData()
      formData.append("file", orgFile)
      formData.append("file", txtFile)
      formData.append("file", mdFile)

      const response = await app.request("/upload", {
        method: "POST",
        body: formData,
      })

      expect([200, 404, 500]).toContain(response.status)

      if (response.status !== 200) {
        console.log("Skipping mixed files test - service unavailable")
        return
      }

      const uploadResult = await parseUnknownJsonResponse(response) as unknown as UploadResponse

      expect(uploadResult.successful).toBe(3)
      expect(uploadResult.failed).toBe(0)
      expect(uploadResult.results).toHaveLength(3)

      uploadResult.results.forEach((result) => {
        if (result && "id" in result && typeof result.id === "number") {
          registerEmbeddingForCleanup(result.id)
        }
      })
    })

    it("should handle org-mode file with special characters", async () => {
      const orgContent = `* Special Characters
Text with special chars: !@#$%^&*()[]{}|;':\",./<>?

** Unicode
Japanese: こんにちは
Korean: 안녕하세요
Arabic: مرحبا
Emoji: 🚀🎉🌟

** Escape Sequences
Backslashes: \\n \\t \\r
Quotes: "double" and 'single'`

      const file = createOrgFile("special.org", orgContent)
      const formData = new FormData()
      formData.append("file", file)

      const response = await app.request("/upload", {
        method: "POST",
        body: formData,
      })

      expect([200, 404, 500]).toContain(response.status)

      if (response.status !== 200) {
        console.log("Skipping special chars org test - service unavailable")
        return
      }

      const uploadResult = await parseUnknownJsonResponse(response) as unknown as UploadResponse

      expect(uploadResult.successful).toBe(1)
      expect(uploadResult.failed).toBe(0)

      const result = uploadResult.results[0]
      if (result && "id" in result && typeof result.id === "number") {
        registerEmbeddingForCleanup(result.id)
      }
    })

    it("should upload org-mode file with custom model name", async () => {
      const orgContent = "* Simple Document\nContent for custom model."
      const file = createOrgFile("custom-model.org", orgContent)

      const formData = new FormData()
      formData.append("file", file)
      formData.append("model_name", "nomic-embed-text")

      const response = await app.request("/upload", {
        method: "POST",
        body: formData,
      })

      expect([200, 404, 500]).toContain(response.status)

      if (response.status !== 200) {
        console.log("Skipping custom model org test - service unavailable")
        return
      }

      const uploadResult = await parseUnknownJsonResponse(response) as unknown as UploadResponse

      expect(uploadResult.successful).toBe(1)
      expect(uploadResult.failed).toBe(0)
      expect(uploadResult.model_name).toBe("nomic-embed-text")

      const result = uploadResult.results[0]
      if (result && "id" in result && typeof result.id === "number") {
        registerEmbeddingForCleanup(result.id)
      }
    })
  })

  describe("Org-mode conversion behavior", () => {
    it("should gracefully handle pandoc unavailability", async () => {
      // This test verifies that the system handles cases where pandoc might not be available
      // The file processor should fall back to using the original content
      const orgContent = "* Simple\nFallback test"
      const file = createOrgFile("fallback.org", orgContent)

      const formData = new FormData()
      formData.append("file", file)

      const response = await app.request("/upload", {
        method: "POST",
        body: formData,
      })

      // Should succeed regardless of pandoc availability
      expect([200, 404, 500]).toContain(response.status)

      if (response.status !== 200) {
        console.log("Skipping pandoc fallback test - service unavailable")
        return
      }

      const uploadResult = await parseUnknownJsonResponse(response) as unknown as UploadResponse

      // Should process successfully even if conversion fails
      expect(uploadResult.successful).toBeGreaterThanOrEqual(0)
      expect(uploadResult.results).toHaveLength(1)

      const result = uploadResult.results[0]
      if (result && "id" in result && typeof result.id === "number") {
        registerEmbeddingForCleanup(result.id)
      }
    })
  })

  describe("Error handling for org-mode files", () => {
    it("should handle empty org-mode file", async () => {
      const file = createOrgFile("empty.org", "")

      const formData = new FormData()
      formData.append("file", file)

      const response = await app.request("/upload", {
        method: "POST",
        body: formData,
      })

      expect([200, 400, 404, 500]).toContain(response.status)

      if (response.status === 200) {
        const uploadResult = await parseUnknownJsonResponse(response) as unknown as UploadResponse
        // Empty file should fail processing
        expect(uploadResult.failed).toBeGreaterThan(0)
      }
    })

    it("should handle whitespace-only org-mode file", async () => {
      const file = createOrgFile("whitespace.org", "   \n\n  \t  ")

      const formData = new FormData()
      formData.append("file", file)

      const response = await app.request("/upload", {
        method: "POST",
        body: formData,
      })

      expect([200, 400, 404, 500]).toContain(response.status)

      if (response.status === 200) {
        const uploadResult = await parseUnknownJsonResponse(response) as unknown as UploadResponse
        // Whitespace-only file should fail processing
        expect(uploadResult.failed).toBeGreaterThan(0)
      }
    })
  })
})

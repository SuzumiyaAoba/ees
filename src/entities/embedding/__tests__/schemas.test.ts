import { describe, expect, it } from "vitest"
import { CreateEmbeddingRequestSchema as CreateEmbeddingSchema } from "../model/openapi"

describe("Validation Schemas", () => {
  describe("CreateEmbeddingSchema", () => {
    it("should validate valid embedding request", () => {
      const validData = {
        uri: "file://test.txt",
        text: "Test document content",
        model_name: "embeddinggemma:300m",
      }

      const result = CreateEmbeddingSchema.safeParse(validData)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(validData)
      }
    })

    it("should validate request without optional model_name", () => {
      const validData = {
        uri: "file://test.txt",
        text: "Test document content",
      }

      const result = CreateEmbeddingSchema.safeParse(validData)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.model_name).toBe("embeddinggemma:300m")
      }
    })

    it("should apply default model_name when not provided", () => {
      const inputData = {
        uri: "file://test.txt",
        text: "Test content",
      }

      const result = CreateEmbeddingSchema.parse(inputData)

      expect(result.model_name).toBe("embeddinggemma:300m")
    })

    it("should preserve custom model_name when provided", () => {
      const inputData = {
        uri: "file://test.txt",
        text: "Test content",
        model_name: "custom-model:latest",
      }

      const result = CreateEmbeddingSchema.parse(inputData)

      expect(result.model_name).toBe("custom-model:latest")
    })

    it("should handle empty string model_name", () => {
      const inputData = {
        uri: "file://test.txt",
        text: "Test content",
        model_name: "",
      }

      const result = CreateEmbeddingSchema.parse(inputData)

      expect(result.model_name).toBe("")
    })

    describe("URI validation", () => {
      it("should reject empty URI", () => {
        const invalidData = {
          uri: "",
          text: "Test content",
        }

        const result = CreateEmbeddingSchema.safeParse(invalidData)

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("URI is required")
          expect(result.error.issues[0].path).toEqual(["uri"])
        }
      })

      it("should reject missing URI", () => {
        const invalidData = {
          text: "Test content",
        }

        const result = CreateEmbeddingSchema.safeParse(invalidData)

        expect(result.success).toBe(false)
        if (!result.success) {
          const uriError = result.error.issues.find(
            (issue) => issue.path[0] === "uri"
          )
          expect(uriError).toBeDefined()
        }
      })

      it("should accept file:// URIs", () => {
        const validData = {
          uri: "file://path/to/document.txt",
          text: "Test content",
        }

        const result = CreateEmbeddingSchema.safeParse(validData)

        expect(result.success).toBe(true)
      })

      it("should accept http:// URIs", () => {
        const validData = {
          uri: "http://example.com/document.html",
          text: "Test content",
        }

        const result = CreateEmbeddingSchema.safeParse(validData)

        expect(result.success).toBe(true)
      })

      it("should accept https:// URIs", () => {
        const validData = {
          uri: "https://example.com/secure-document.html",
          text: "Test content",
        }

        const result = CreateEmbeddingSchema.safeParse(validData)

        expect(result.success).toBe(true)
      })

      it("should accept custom scheme URIs", () => {
        const validData = {
          uri: "custom://identifier/123",
          text: "Test content",
        }

        const result = CreateEmbeddingSchema.safeParse(validData)

        expect(result.success).toBe(true)
      })

      it("should accept URIs with special characters", () => {
        const validData = {
          uri: "file://path/with/special-chars@#$%^&*()_+.txt",
          text: "Test content",
        }

        const result = CreateEmbeddingSchema.safeParse(validData)

        expect(result.success).toBe(true)
      })

      it("should accept URIs with Unicode characters", () => {
        const validData = {
          uri: "file://パス/に/日本語/文書.txt",
          text: "Test content",
        }

        const result = CreateEmbeddingSchema.safeParse(validData)

        expect(result.success).toBe(true)
      })

      it("should accept very long URIs", () => {
        const longPath = "very-long-path-".repeat(100)
        const validData = {
          uri: `file://${longPath}document.txt`,
          text: "Test content",
        }

        const result = CreateEmbeddingSchema.safeParse(validData)

        expect(result.success).toBe(true)
      })

      it("should handle URI with query parameters", () => {
        const validData = {
          uri: "https://example.com/doc?id=123&version=2&format=html",
          text: "Test content",
        }

        const result = CreateEmbeddingSchema.safeParse(validData)

        expect(result.success).toBe(true)
      })

      it("should handle URI with fragments", () => {
        const validData = {
          uri: "https://example.com/doc#section-1",
          text: "Test content",
        }

        const result = CreateEmbeddingSchema.safeParse(validData)

        expect(result.success).toBe(true)
      })
    })

    describe("Text validation", () => {
      it("should reject empty text", () => {
        const invalidData = {
          uri: "file://test.txt",
          text: "",
        }

        const result = CreateEmbeddingSchema.safeParse(invalidData)

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Text is required")
          expect(result.error.issues[0].path).toEqual(["text"])
        }
      })

      it("should reject missing text", () => {
        const invalidData = {
          uri: "file://test.txt",
        }

        const result = CreateEmbeddingSchema.safeParse(invalidData)

        expect(result.success).toBe(false)
        if (!result.success) {
          const textError = result.error.issues.find(
            (issue) => issue.path[0] === "text"
          )
          expect(textError).toBeDefined()
        }
      })

      it("should accept single character text", () => {
        const validData = {
          uri: "file://test.txt",
          text: "a",
        }

        const result = CreateEmbeddingSchema.safeParse(validData)

        expect(result.success).toBe(true)
      })

      it("should accept very long text", () => {
        const longText = "a".repeat(100000)
        const validData = {
          uri: "file://test.txt",
          text: longText,
        }

        const result = CreateEmbeddingSchema.safeParse(validData)

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.text).toBe(longText)
        }
      })

      it("should accept text with Unicode characters", () => {
        const unicodeText =
          "こんにちは世界! 🌍 Testing émojis and spëcial chars"
        const validData = {
          uri: "file://unicode.txt",
          text: unicodeText,
        }

        const result = CreateEmbeddingSchema.safeParse(validData)

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.text).toBe(unicodeText)
        }
      })

      it("should accept text with newlines and whitespace", () => {
        const multilineText =
          "Line 1\nLine 2\r\nLine 3\n\tIndented line\n  Spaced line"
        const validData = {
          uri: "file://multiline.txt",
          text: multilineText,
        }

        const result = CreateEmbeddingSchema.safeParse(validData)

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.text).toBe(multilineText)
        }
      })

      it("should accept text with special characters", () => {
        const specialText = "Special chars: !@#$%^&*()_+-=[]{}|;':\",./<>?"
        const validData = {
          uri: "file://special.txt",
          text: specialText,
        }

        const result = CreateEmbeddingSchema.safeParse(validData)

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.text).toBe(specialText)
        }
      })

      it("should accept text with HTML/XML content", () => {
        const htmlText =
          "<html><body><h1>Title</h1><p>Content with &amp; entities</p></body></html>"
        const validData = {
          uri: "file://html.txt",
          text: htmlText,
        }

        const result = CreateEmbeddingSchema.safeParse(validData)

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.text).toBe(htmlText)
        }
      })

      it("should accept text with JSON content", () => {
        const jsonText = '{"key": "value", "number": 42, "array": [1, 2, 3]}'
        const validData = {
          uri: "file://json.txt",
          text: jsonText,
        }

        const result = CreateEmbeddingSchema.safeParse(validData)

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.text).toBe(jsonText)
        }
      })

      it("should handle whitespace-only text", () => {
        const whitespaceText = "   \n\t\r   "
        const validData = {
          uri: "file://whitespace.txt",
          text: whitespaceText,
        }

        const result = CreateEmbeddingSchema.safeParse(validData)

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.text).toBe(whitespaceText)
        }
      })
    })

    describe("Model name validation", () => {
      it("should accept standard model names", () => {
        const modelNames = [
          "embeddinggemma:300m",
          "llama2:7b",
          "mistral:latest",
          "custom-model:v1.0",
        ]

        modelNames.forEach((modelName) => {
          const validData = {
            uri: "file://test.txt",
            text: "Test content",
            model_name: modelName,
          }

          const result = CreateEmbeddingSchema.safeParse(validData)

          expect(result.success).toBe(true)
          if (result.success) {
            expect(result.data.model_name).toBe(modelName)
          }
        })
      })

      it("should accept model names with special characters", () => {
        const specialModelNames = [
          "model-with-dashes:latest",
          "model_with_underscores:v1",
          "model.with.dots:123",
          "model@with@symbols:beta",
        ]

        specialModelNames.forEach((modelName) => {
          const validData = {
            uri: "file://test.txt",
            text: "Test content",
            model_name: modelName,
          }

          const result = CreateEmbeddingSchema.safeParse(validData)

          expect(result.success).toBe(true)
          if (result.success) {
            expect(result.data.model_name).toBe(modelName)
          }
        })
      })

      it("should accept very long model names", () => {
        const longModelName = `${"very-long-model-name-".repeat(10)}:latest`
        const validData = {
          uri: "file://test.txt",
          text: "Test content",
          model_name: longModelName,
        }

        const result = CreateEmbeddingSchema.safeParse(validData)

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.model_name).toBe(longModelName)
        }
      })
    })

    describe("Type safety and inference", () => {
      it("should infer correct types", () => {
        const validData = {
          uri: "file://test.txt",
          text: "Test content",
          model_name: "test-model:latest",
        }

        const result = CreateEmbeddingSchema.parse(validData)

        // TypeScript should infer these types correctly
        const uri: string = result.uri
        const text: string = result.text
        const modelName: string = result.model_name

        expect(typeof uri).toBe("string")
        expect(typeof text).toBe("string")
        expect(typeof modelName).toBe("string")
      })

      it("should handle optional model_name in type inference", () => {
        const validData = {
          uri: "file://test.txt",
          text: "Test content",
          // model_name is optional
        }

        const result = CreateEmbeddingSchema.parse(validData)

        // model_name should be string (with default value)
        const modelName: string = result.model_name

        expect(typeof modelName).toBe("string")
        expect(modelName).toBe("embeddinggemma:300m")
      })
    })

    describe("Error handling and messages", () => {
      it("should provide multiple error messages for multiple invalid fields", () => {
        const invalidData = {
          uri: "",
          text: "",
          model_name: "valid-model",
        }

        const result = CreateEmbeddingSchema.safeParse(invalidData)

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues).toHaveLength(2)

          const uriError = result.error.issues.find(
            (issue) => issue.path[0] === "uri"
          )
          const textError = result.error.issues.find(
            (issue) => issue.path[0] === "text"
          )

          expect(uriError?.message).toBe("URI is required")
          expect(textError?.message).toBe("Text is required")
        }
      })

      it("should handle wrong data types", () => {
        const invalidData = {
          uri: 123, // should be string
          text: true, // should be string
          model_name: [], // should be string
        }

        const result = CreateEmbeddingSchema.safeParse(invalidData)

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues).toHaveLength(3)

          result.error.issues.forEach((issue) => {
            expect(issue.code).toBe("invalid_type")
          })
        }
      })

      it("should handle null values", () => {
        const invalidData = {
          uri: null,
          text: null,
          model_name: null,
        }

        const result = CreateEmbeddingSchema.safeParse(invalidData)

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues.length).toBeGreaterThan(0)
        }
      })

      it("should handle undefined values for required fields", () => {
        const invalidData = {
          uri: undefined,
          text: undefined,
          model_name: "valid-model",
        }

        const result = CreateEmbeddingSchema.safeParse(invalidData)

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues.length).toBeGreaterThan(0)
        }
      })

      it("should handle extra fields gracefully", () => {
        const dataWithExtraFields = {
          uri: "file://test.txt",
          text: "Test content",
          model_name: "test-model",
          extra_field: "should be ignored",
          another_extra: 123,
        }

        const result = CreateEmbeddingSchema.safeParse(dataWithExtraFields)

        expect(result.success).toBe(true)
        if (result.success) {
          // Extra fields should not be present in the result
          expect(result.data).not.toHaveProperty("extra_field")
          expect(result.data).not.toHaveProperty("another_extra")
          expect(Object.keys(result.data)).toEqual([
            "uri",
            "text",
            "model_name",
          ])
        }
      })
    })

    describe("Edge cases and boundary conditions", () => {
      it("should handle extremely nested or complex data", () => {
        const complexData = {
          uri: "file://test.txt",
          text: "Test content",
          model_name: "test-model",
          nested: {
            deeply: {
              nested: {
                object: "should be ignored",
              },
            },
          },
        }

        const result = CreateEmbeddingSchema.safeParse(complexData)

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).not.toHaveProperty("nested")
        }
      })

      it("should handle array inputs", () => {
        const arrayData = ["file://test.txt", "Test content", "test-model"]

        const result = CreateEmbeddingSchema.safeParse(arrayData)

        expect(result.success).toBe(false)
      })

      it("should handle primitive inputs", () => {
        const primitiveInputs = ["string", 123, true, null, undefined]

        primitiveInputs.forEach((input) => {
          const result = CreateEmbeddingSchema.safeParse(input)
          expect(result.success).toBe(false)
        })
      })

      it("should handle circular references gracefully", () => {
        const circularData: Record<string, unknown> = {
          uri: "file://test.txt",
          text: "Test content",
        }
        circularData.self = circularData

        // Should not throw an error, even with circular references
        const result = CreateEmbeddingSchema.safeParse(circularData)

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).not.toHaveProperty("self")
        }
      })
    })
  })
})

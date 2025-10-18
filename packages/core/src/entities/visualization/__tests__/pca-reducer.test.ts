import { describe, it, expect } from "vitest"
import { Effect } from "effect"
import { reducePCA, PCAReducerError } from "@/entities/visualization/lib/pca-reducer"

describe("PCA Reducer", () => {
  it("should reduce 3D vectors to 2D", async () => {
    const vectors = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
      [10, 11, 12],
    ]

    const result = await Effect.runPromise(reducePCA(vectors, 2))

    expect(result.coordinates).toHaveLength(4)
    expect(result.coordinates[0]).toHaveLength(2)
  })

  it("should reduce 5D vectors to 3D", async () => {
    const vectors = [
      [1, 2, 3, 4, 5],
      [6, 7, 8, 9, 10],
      [11, 12, 13, 14, 15],
      [16, 17, 18, 19, 20],
    ]

    const result = await Effect.runPromise(reducePCA(vectors, 3))

    expect(result.coordinates).toHaveLength(4)
    expect(result.coordinates[0]).toHaveLength(3)
  })

  it("should fail with empty vector array", async () => {
    const vectors: number[][] = []

    const result = await Effect.runPromise(
      reducePCA(vectors, 2).pipe(Effect.flip)
    )

    expect(result._tag).toBe("PCAReducerError")
    expect(result.message).toContain("No vectors provided")
  })

  it("should fail when vectors are less than target dimensions", async () => {
    const vectors = [
      [1, 2, 3],
    ]

    const result = await Effect.runPromise(
      reducePCA(vectors, 2).pipe(Effect.flip)
    )

    expect(result._tag).toBe("PCAReducerError")
    expect(result.message).toContain("requires at least 2 vectors")
  })

  it("should produce deterministic results", async () => {
    const vectors = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
      [10, 11, 12],
    ]

    const result1 = await Effect.runPromise(reducePCA(vectors, 2))
    const result2 = await Effect.runPromise(reducePCA(vectors, 2))

    expect(result1.coordinates).toEqual(result2.coordinates)
  })
})

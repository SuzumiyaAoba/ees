import { createRoute, z } from "@hono/zod-openapi"

/**
 * List directory contents endpoint
 * Returns list of subdirectories in the specified path
 */
export const listDirectoryRoute = createRoute({
  method: "get",
  path: "/file-system/list",
  tags: ["File System"],
  summary: "List directory contents",
  description: "Returns list of subdirectories in the specified path for directory picker",
  request: {
    query: z.object({
      path: z.string().describe("Directory path to list"),
    }),
  },
  responses: {
    200: {
      description: "List of directories",
      content: {
        "application/json": {
          schema: z.object({
            path: z.string(),
            entries: z.array(
              z.object({
                name: z.string(),
                path: z.string(),
                isDirectory: z.boolean(),
              })
            ),
          }),
        },
      },
    },
    400: {
      description: "Invalid path or path does not exist",
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
    },
    500: {
      description: "Server error",
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
    },
  },
})

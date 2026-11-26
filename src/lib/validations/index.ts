import { z } from "zod";
import { NextResponse } from "next/server";

/**
 * Validate request body against a Zod schema.
 * Returns null if valid, or a 400 NextResponse with error details if invalid.
 *
 * Usage:
 *   const result = validateBody(schema, body);
 *   if (result.error) return result.error;
 *   const data = result.data; // typed!
 */
export function validateBody<T extends z.ZodType>(
  schema: T,
  body: unknown
): { data: z.infer<T>; error: null } | { data: null; error: NextResponse } {
  const result = schema.safeParse(body);

  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));

    console.warn("[VALIDATION] Rejected payload:", JSON.stringify(details));

    return {
      data: null,
      error: NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details,
        },
        { status: 400 }
      ),
    };
  }

  return { data: result.data, error: null };
}

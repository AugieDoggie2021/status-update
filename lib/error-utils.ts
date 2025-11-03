import { ZodError } from "zod";

export function firstZodMessage(err: unknown, fallback = "Validation failed") {
  if (err instanceof ZodError) {
    return err.issues?.[0]?.message ?? fallback;
  }
  if (typeof err === "object" && err && "message" in err) {
    return String((err as any).message ?? fallback);
  }
  return fallback;
}


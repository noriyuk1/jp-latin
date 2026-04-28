import { fetchAction, fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "../convex/_generated/api";

export { api };

const convexServerClient = {
  action: fetchAction,
  query: fetchQuery,
  mutation: fetchMutation
};

export function getConvexClient(): typeof convexServerClient | null {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) return null;
  return convexServerClient;
}

export function requireConvexClient(): typeof convexServerClient {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is required for Convex-backed storage");
  }

  return convexServerClient;
}

export function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, stripUndefined(item)])
    ) as T;
  }

  return value;
}

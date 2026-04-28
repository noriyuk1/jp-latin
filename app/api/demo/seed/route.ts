import { NextResponse } from "next/server";
import { api, requireConvexClient } from "../../../../lib/convex-client.ts";

export async function POST(request: Request) {
  const convex = requireConvexClient();
  await convex.mutation(api.demo.seed, {});
  return NextResponse.redirect(new URL("/admin/address-conversions", request.url), {
    status: 303
  });
}

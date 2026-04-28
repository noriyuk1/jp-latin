import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const robotsHeader = "noindex, nofollow, noarchive, nosnippet, noimageindex";

export function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers
    }
  });

  response.headers.set("X-Robots-Tag", robotsHeader);

  return response;
}

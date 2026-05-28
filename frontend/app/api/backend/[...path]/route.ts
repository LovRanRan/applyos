import { NextRequest, NextResponse } from "next/server";

type ProxyContext = {
  params: Promise<{ path: string[] }>;
};

const BACKEND_API_BASE =
  process.env.BACKEND_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000";

function backendUrl(path: string[], request: NextRequest): string {
  const url = new URL(`/${path.join("/")}`, BACKEND_API_BASE);
  url.search = request.nextUrl.search;
  return url.toString();
}

async function proxy(request: NextRequest, context: ProxyContext): Promise<NextResponse> {
  const { path } = await context.params;
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  const authorization = request.headers.get("authorization");

  if (contentType) {
    headers.set("content-type", contentType);
  }
  if (authorization) {
    headers.set("authorization", authorization);
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const upstream = await fetch(backendUrl(path, request), {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    cache: "no-store"
  });

  const responseHeaders = new Headers();
  const upstreamContentType = upstream.headers.get("content-type");
  if (upstreamContentType) {
    responseHeaders.set("content-type", upstreamContentType);
  }

  if (upstream.status === 204) {
    return new NextResponse(null, { status: upstream.status, headers: responseHeaders });
  }

  return new NextResponse(await upstream.arrayBuffer(), {
    status: upstream.status,
    headers: responseHeaders
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;

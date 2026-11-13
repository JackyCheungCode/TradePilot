export interface ResponseMeta {
  requestId: string;
}

export function getRequestId(request: Request): string {
  return request.headers.get("X-Request-Id")?.trim() || crypto.randomUUID();
}

export function successResponse<T>(
  request: Request,
  data: T,
  status = 200,
): Response {
  const requestId = getRequestId(request);

  return Response.json(
    { data, meta: { requestId } satisfies ResponseMeta },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Request-Id": requestId,
      },
    },
  );
}

export function errorResponse(
  request: Request,
  code: string,
  message: string,
  status: number,
): Response {
  const requestId = getRequestId(request);

  return Response.json(
    { error: { code, message, requestId } },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Request-Id": requestId,
      },
    },
  );
}

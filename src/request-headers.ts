const forbiddenHeaderNames = new Set([
  "accept-charset",
  "accept-encoding",
  "access-control-request-headers",
  "access-control-request-method",
  "connection",
  "content-length",
  "cookie",
  "cookie2",
  "date",
  "dnt",
  "expect",
  "host",
  "keep-alive",
  "origin",
  "permissions-policy",
  "referer",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "user-agent",
  "via",
]);

export function isBrowserOwnedHeader(normalizedName: string): boolean {
  return (
    forbiddenHeaderNames.has(normalizedName) ||
    normalizedName.startsWith("proxy-") ||
    normalizedName.startsWith("sec-")
  );
}

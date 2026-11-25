/** Result of checking that a link's destination URL resolves. */
export type UrlCheck = {
  /**
   * - ok: the URL loaded (2xx after following redirects)
   * - warn: the server answered but refused the check (401/403/429/…), so the
   *   link probably works in a browser
   * - error: DNS failure, timeout, connection error or a 404/5xx-style status
   */
  status: "ok" | "warn" | "error";
  message: string;
  httpStatus?: number;
};

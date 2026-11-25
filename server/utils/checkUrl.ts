import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { domainProblem } from "#shared/utils/domain";
import type { UrlCheck } from "#shared/utils/urlCheck";

const TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 5;

// Statuses that usually mean "bot blocked" rather than "page missing"
const BLOCKED_STATUSES = new Set([401, 403, 406, 429, 999]);

// Private, loopback, link-local and other non-public ranges. Checking these
// would let anyone with an account probe the server's internal network.
const blocked = new BlockList();

for (const [net, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blocked.addSubnet(net, prefix, "ipv4");
}

for (const [net, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  blocked.addSubnet(net, prefix, "ipv6");
}

const isPublicAddress = (address: string) => {
  const family = isIP(address);

  if (family === 0) return false;

  return !blocked.check(address, family === 4 ? "ipv4" : "ipv6");
};

/** Throws a readable error if the URL isn't a public http(s) domain. */
const assertPublicHost = async (url: URL) => {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https links can be checked");
  }

  // URL keeps the brackets on IPv6 hosts and may end in a root dot
  const host = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "");

  const problem = domainProblem(host);

  if (problem) throw new Error(problem);

  let addresses: string[];

  try {
    addresses = (await lookup(host, { all: true })).map((a) => a.address);
  } catch {
    throw new Error(`${host} does not resolve`);
  }

  // A real domain can still point at a private IP (e.g. 127.0.0.1.nip.io)
  if (addresses.length === 0 || !addresses.every(isPublicAddress)) {
    throw new Error(`${host} is not a public address`);
  }
};

const request = async (url: URL, method: "HEAD" | "GET") => {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
      "User-Agent": "Mozilla/5.0 (compatible; LinkChecker/1.0)",
    },
    method,
    // Follow redirects by hand so each hop gets the public-address check
    redirect: "manual",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  // Only the status matters; don't download the body
  await response.body?.cancel().catch(() => {});

  return response;
};

/**
 * Checks that a destination URL resolves and loads. Tries HEAD first and falls
 * back to GET, since plenty of servers mishandle HEAD.
 */
export const checkUrl = async (input: string): Promise<UrlCheck> => {
  let url: URL;

  try {
    url = new URL(input);
  } catch {
    return { message: "Not a valid URL", status: "error" };
  }

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      await assertPublicHost(url);

      let response = await request(url, "HEAD");

      if (response.status >= 400) response = await request(url, "GET");

      const location = response.headers.get("location");

      if (response.status >= 300 && response.status < 400 && location) {
        url = new URL(location, url);
        continue;
      }

      const httpStatus = response.status;

      if (httpStatus < 400) {
        return {
          httpStatus,
          message: `Resolves (${httpStatus})`,
          status: "ok",
        };
      }

      if (BLOCKED_STATUSES.has(httpStatus)) {
        return {
          httpStatus,
          message: `Server refused the check (${httpStatus}); it may still work in a browser`,
          status: "warn",
        };
      }

      return {
        httpStatus,
        message: `Destination returned ${httpStatus}`,
        status: "error",
      };
    }

    return { message: "Too many redirects", status: "error" };
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return { message: "Timed out", status: "error" };
    }

    if (error instanceof Error && !(error instanceof TypeError)) {
      return { message: error.message, status: "error" };
    }

    // fetch throws TypeError("fetch failed") for network errors
    return { message: "Could not connect", status: "error" };
  }
};

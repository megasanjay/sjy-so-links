import { parse as parseDomain } from "tldts";

// Real ICANN TLDs that are still private networks: Tailscale MagicDNS and
// Funnel names, and .arpa (home.arpa is the standard home-network domain)
const PRIVATE_NETWORK_SUFFIXES = ["arpa", "ts.net", "tailscale.net"];

/**
 * Returns why `host` isn't a real public domain name, or null if it is.
 * Shared so the browser and server apply the same rules.
 */
export const domainProblem = (hostname: string) => {
  // URL keeps the brackets on IPv6 hosts and may end in a root dot
  const host = hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "");

  const { domain, isIcann, isIp } = parseDomain(host);

  if (isIp || host.includes(":")) return "Use a domain name, not an IP address";

  // isIcann rules out made-up and local TLDs (.local, .lan, .internal,
  // localhost, …); a null domain means a bare TLD like "com"
  if (!domain || !isIcann) return `${host} is not a real domain`;

  const isPrivateNetwork = PRIVATE_NETWORK_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );

  if (isPrivateNetwork) return `${host} is a private network address`;

  return null;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return url;
  }
};

/**
 * Runs `check` once per distinct URL, politely: URLs on the same host run one
 * at a time with `delayMs` between them, while up to `concurrency` different
 * hosts run in parallel. Used by both the browser and server link checks so
 * no site gets a burst of requests.
 */
export const checkSpacedByHost = async <T>(
  urls: Iterable<string>,
  check: (url: string) => Promise<T>,
  { concurrency = 4, delayMs = 1000 } = {},
) => {
  const urlsByHost = new Map<string, Set<string>>();

  for (const url of urls) {
    const host = hostOf(url);
    const group = urlsByHost.get(host) ?? new Set<string>();

    group.add(url);
    urlsByHost.set(host, group);
  }

  const results = new Map<string, T>();
  const hostQueue = [...urlsByHost.values()];

  // Each worker takes one host at a time, so no host sees two checks at once
  const worker = async () => {
    for (let group = hostQueue.shift(); group; group = hostQueue.shift()) {
      let first = true;

      for (const url of group) {
        if (!first) await sleep(delayMs);
        first = false;

        results.set(url, await check(url));
      }
    }
  };

  await Promise.all(Array.from({ length: concurrency }, worker));

  return results;
};

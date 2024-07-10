import os from "node:os";
import crypto from "crypto";
import { Cache, FileSystemCache } from "file-system-cache";
import { getConfig } from "./index.js";

// Module global holds the cache instance
let cacheInstance: FileSystemCache | undefined = undefined;

export function getCache(): FileSystemCache | undefined {
  // Only use the cache if it is enabled in the config
  let config = getConfig();
  if (!cacheInstance && config.cache) {
    cacheInstance = new Cache({
      basePath:
        process.env.LMEVAL_CACHE_PATH || `${os.homedir()}/.lmeval/cache`,
      ns: "lmeval",
      ttl: 60 * 60 * 24 * 7, // 1 week
    });
  }
  return cacheInstance;
}

// Return hash for an object
export function objectHash(obj: any): string {
  let hash = crypto
    .createHash("sha1")
    .update(JSON.stringify(obj))
    .digest("hex");
  return hash;
}

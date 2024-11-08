import cacheFile from "../../textOutputs/cache.json" with { type: "json" };
import fs from "node:fs";
import { dirname } from "path";

const appDir = dirname(import.meta.filename);
const cache: Record<string, string> = cacheFile as Record<string, string>;

export function readCache(url: string): string | undefined {
  return cache[url];
}

export function writeCache(url: string, html: string) {
  cache[url] = html;
  fs.writeFileSync(`${appDir}/../../textOutputs/cache.json`, JSON.stringify(cache));
}

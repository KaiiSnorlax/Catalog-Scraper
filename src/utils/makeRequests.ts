import { JSDOM } from "jsdom";
import { readCache, writeCache } from "./cache.js";

let lastRequestTime = 0;
const maxRequestTime = 2000;

async function makeRequest(url: string) {
  const cache = readCache(url);
  if (cache) {
    return cache;
  }
  while (Date.now() - lastRequestTime <= maxRequestTime) {
    await new Promise((res) => setTimeout(res, Date.now() - lastRequestTime));
  }
  lastRequestTime = Date.now();

  const html = await fetch(url).then((res) => res.text());
  writeCache(url, html);
  return html;
}

export async function getDocument(url: string) {
  const html = await makeRequest(url);
  const document = new JSDOM(html).window.document;
  return document;
}

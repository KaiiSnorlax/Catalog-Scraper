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

  try {
    const res = await fetch(url);
    if (res.ok) {
      const html = await res.text();
      writeCache(url, html);
      return html;
    } else {
      console.error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
      return null;
    }
  } catch (e) {
    console.error("Connection error", e);
    return null;
  }
}

export async function getDocument(url: string) {
  const html = await makeRequest(url);
  if (html) {
    const document = new JSDOM(html).window.document;
    return document;
  } else {
    throw Error("Document not found! " + url);
  }
}

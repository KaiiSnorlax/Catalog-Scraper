import sql, { one } from "./database.js";
import { getDocument } from "./utils/makeRequests.js";
import fs from "node:fs";
import { dirname } from "path";
import { readCache, writeCache } from "./utils/cache.js";

let totalConcentrations = 0;

export interface Program {
  id: number;
  name: string;
  type: string;
  url: string;
}

export interface Concentration {
  id: number;
  name: string;
  url?: string;
}

export interface ProgramConcentrations {
  program: Program;
  concentrations: Concentration[];
}

const appDir = dirname(import.meta.filename);
const programs = JSON.parse(fs.readFileSync(`${appDir}/../textData/DBPrograms.json`, "utf8")) as Program[];
const programConcentrations = JSON.parse(
  fs.readFileSync(`${appDir}/../textData/DBConcentrations.json`, "utf8")
) as ProgramConcentrations[];

for (const program of programConcentrations) {
  const concentrations = program.concentrations;
  if (concentrations.length === 0) {
    continue;
  }

  for (const concentration of concentrations) {
    if (concentration.url) {
      const document = await getDocument(concentration.url);
      if (!document) {
        console.log(concentration.name, "\n", concentration.url);
        continue;
      }
    } else {
    }
  }
}

const content = JSON.stringify(programConcentrations, null, 2);
fs.writeFileSync(`${appDir}/../textData/DBConcentrations.json`, content);

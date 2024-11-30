import { getDocument } from "./utils/makeRequests.js";
import fs from "node:fs";
import { dirname } from "path";

const appDir = dirname(import.meta.filename);

export interface RawProgramRequirements {
  id: number;
  program: string;
  requirements: Row[];
}

export type Row = Header | Course | Comment;

interface Header {
  type: "header";
  areaHeader: string[];
}

interface Course {
  type: "course" | "orcourse";
  codeCol: string;
  hoursCol?: string;
}

interface Comment {
  type: "comment";
  courseListComment: string;
  hoursCol?: string;
}

export interface Program {
  id: number;
  name: string;
  type: string;
  url: string;
}

const programs = JSON.parse(fs.readFileSync(`${appDir}/../textData/DBPrograms.json`, "utf8")) as Program[];

const promises = [];
for (const program of programs) {
  promises.push(getProgram(program));
}
const programRequirements = await Promise.all(promises);

const content = JSON.stringify(programRequirements, null, 2);
fs.writeFileSync(`${appDir}/../textOutputs/rawProgramRequirements.json`, content);

async function getProgram(program: Program): Promise<RawProgramRequirements> {
  const document = await getDocument(program.url);

  const rows = [...document.querySelectorAll("table.sc_courselist tbody tr")];

  const requirements: Row[] = [];
  for (const row of rows) {
    const parsedRow = parseRow(row);

    if (parsedRow === null) {
      throw Error(`Unexpected row format for program ${program.name}: ${row.textContent}`);
    }

    if (parsedRow) {
      requirements.push(parsedRow);
    }
  }

  return { id: program.id, program: program.name, requirements: requirements };
}

function parseRow(row: Element): Row | false | null {
  const areaHeader = [...row.querySelectorAll("td span.areaheader")]
    .map((elem) => elem.textContent?.trim())
    .filter((it) => it !== undefined);

  const codeCol = row.querySelector("td.codecol")?.textContent ?? undefined;
  const hoursCol = row.querySelector("td.hourscol")?.textContent ?? undefined;
  const courseListComment = row.querySelector("td span.courselistcomment")?.textContent ?? undefined;

  if (areaHeader.length > 0) {
    return {
      type: "header",
      areaHeader,
    };
  }

  if (codeCol) {
    return {
      type: row.classList.contains("orclass") ? "orcourse" : "course",
      codeCol,
      ...(hoursCol && { hoursCol }),
    };
  }

  if (courseListComment) {
    return {
      type: "comment",
      courseListComment,
      ...(hoursCol && { hoursCol }),
    };
  }

  if (row.classList.contains("listsum")) {
    return false;
  }

  return null;
}

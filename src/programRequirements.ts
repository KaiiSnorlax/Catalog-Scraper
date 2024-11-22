import { getDocument } from "./utils/makeRequests.js";
import fs from "node:fs";
import { dirname } from "path";

const appDir = dirname(import.meta.filename);

const promises = [];

export interface rawProgramRequirements {
  id: number;
  program: string;
  requirements: requirements[];
}

export interface requirements {
  courseListComment?: string[];
  codeCol?: string;
  hoursCol?: string;
}

export interface Program {
  id: number;
  name: string;
  type: string;
  url: string;
}

const programs = JSON.parse(fs.readFileSync(`${appDir}/../textData/DBPrograms.json`, "utf8")) as Program[];

for (const program of programs) {
  promises.push(getPrograms(program));
}

const programRequirements = await Promise.all(promises);
const content = JSON.stringify(programRequirements, null, 2);
fs.writeFileSync(`${appDir}/../textOutputs/rawProgramRequirements.json`, content);

export async function getPrograms(program: Program): Promise<rawProgramRequirements> {
  const document = await getDocument(program.url);
  const rows = [...document.querySelectorAll("table.sc_courselist tbody tr")];
  const requirements: requirements[] = [];
  for (const i in rows) {
    const requirement: { courseListComment?: string[]; codeCol?: string; hoursCol?: string } = {};
    const courseListComment = [...rows[i].querySelectorAll("td span.courselistcomment")].map(
      (elem) => elem.textContent!
    );
    const codeCol = [...rows[i].querySelectorAll("td.codecol")].map((elem) => elem.textContent!);
    const hoursCol = [...rows[i].querySelectorAll("td.hourscol")].map((elem) => elem.textContent!);

    if (codeCol.length > 0 && codeCol[0] !== "") {
      requirement.codeCol = codeCol[0];
    }
    if (hoursCol.length > 0 && hoursCol[0] !== "") {
      requirement.hoursCol = hoursCol[0];
    }
    if (courseListComment.length > 0) {
      requirement.courseListComment = courseListComment;
    }
    requirements.push(requirement);
  }
  return { id: program.id, program: program.name, requirements: requirements };
}

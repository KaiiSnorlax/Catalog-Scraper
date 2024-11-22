import fs, { promises } from "node:fs";
import { dirname } from "path";
// import { rawProgramRequirements, requirements } from "./programRequirements.js";

export interface RawProgramRequirements {
  id: number;
  program: string;
  requirements: Requirements[];
}

export interface Requirements {
  courseListComment?: string[];
  codeCol?: string;
  hoursCol?: string;
}

const appDir = dirname(import.meta.filename);
const rawProgramRequirements = JSON.parse(
  fs.readFileSync(`${appDir}/../textOutputs/rawProgramRequirements.json`, "utf8")
) as RawProgramRequirements[];

listRequirements(rawProgramRequirements);

async function listRequirements(rawProgramRequirements: RawProgramRequirements[]) {
  const reqBlocks: { programId: number; blocks: Requirements[] }[] = [];
  for (const program of rawProgramRequirements) {
    const blocks = [];
    let currentBlock = [];
    currentBlock.push(program.requirements[0]);
    program.requirements.shift();

    for (const requirements of program.requirements) {
      if (!requirements.codeCol && !requirements.hoursCol && requirements.courseListComment) {
        blocks.push(currentBlock);
        currentBlock = [];
        currentBlock.push(requirements);
        continue;
      }
      if (requirements === program.requirements[program.requirements.length - 1]) {
        currentBlock.push(requirements);
        blocks.push(currentBlock);
        reqBlocks.push({ programId: program.id, blocks: currentBlock });
        currentBlock = [];
        continue;
      }
      currentBlock.push(requirements);
    }
  }
  console.log(reqBlocks);
  const content = JSON.stringify(reqBlocks, null, 2);
  fs.writeFileSync(`${appDir}/../textOutputs/testingReq.json`, content);
}

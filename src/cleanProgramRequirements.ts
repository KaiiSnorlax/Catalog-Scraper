import fs, { promises } from "node:fs";
import { dirname } from "path";
// import { rawProgramRequirements, requirements } from "./programRequirements.js";

export interface RawProgramRequirements {
  id: number;
  program: string;
  requirements: Requirements[];
}

export interface Requirements {
  areaHeader?: string[];
  courseListComment?: string;
  codeCol?: string;
  hoursCol?: string;
}

export interface RequirementBlocks {
  programId: number;
  blocks: {
    header: Requirements;
    courses: Requirements[];
  }[];
}

const appDir = dirname(import.meta.filename);
const rawProgramRequirements = JSON.parse(
  fs.readFileSync(`${appDir}/../textOutputs/rawProgramRequirements.json`, "utf8")
) as RawProgramRequirements[];

const reqBlocks = JSON.parse(
  fs.readFileSync(`${appDir}/../textOutputs/testingReq.json`, "utf8")
) as RequirementBlocks[];

// createBlocks(rawProgramRequirements);
parseBlocks(reqBlocks);

async function parseBlocks(reqBlocks: RequirementBlocks[]) {
  const programs: { program: number; orBlocks: { mainCourse: Requirements; options?: Requirements[] }[] }[] = [];
  for (const program of reqBlocks) {
    const orBlocks: { mainCourse: Requirements; options?: Requirements[] }[] = [];
    for (const reqBlock of program.blocks) {
      const courses = reqBlock.courses;
      let j = 0;
      let options = [];
      for (let i in courses) {
        if (courses[i].hoursCol && j === 1) {
          orBlocks.push({ mainCourse: courses[Number(i) - j] });
          options = [];
          j = 0;
        } else if (courses[i].hoursCol && j > 0) {
          options.shift();
          orBlocks.push({ mainCourse: courses[Number(i) - j], options: options });
          options = [];
          j = 0;
        }
        if (courses[i] === courses[courses.length - 1]) {
          options.push(courses[i]);
          options.shift();
          orBlocks.push({ mainCourse: courses[Number(i) - j], options: options });
          options = [];
          j = 0;
          continue;
        }
        options.push(courses[i]);
        j++;
        //           orBlocks.push({ mainCourse: courses[Number(i) - j], options: options });
        //   options = [];
        //   j = 1;
        //   (courses[i].codeCol && !courses[i].hoursCol) ||
        //   (!courses[i].codeCol && !courses[i].hoursCol && courses[i].courseListComment)
        // ) {
        //   options.push(courses[i]);
        //   j++;
        // if (
        //   (j > 1 && courses[i].codeCol && courses[i].hoursCol) ||
        //   (j > 1 && !courses[i].codeCol && courses[i].hoursCol && courses[i].courseListComment) ||
        //   (j > 1 && !courses[i].codeCol && !courses[i].hoursCol && courses[i].areaHeader)
        // ) {
        // console.log(program.programId, j, i, courses[Number(i) - j]);
        // orBlocks.push({ mainCourse: courses[Number(i) - j], options: options });
        // options = [];
        // j = 1;
        // } else if (
        //   (courses[i].codeCol && !courses[i].hoursCol) ||
        //   (!courses[i].codeCol && !courses[i].hoursCol && courses[i].courseListComment)
        // ) {
        //   options.push(courses[i]);
        //   j++;
        // }
      }
    }
    programs.push({ program: program.programId, orBlocks: orBlocks });
  }

  const content = JSON.stringify(programs, null, 2);
  fs.writeFileSync(`${appDir}/../textOutputs/blocks.json`, content);
}

async function createBlocks(rawProgramRequirements: RawProgramRequirements[]) {
  const reqBlocks: RequirementBlocks[] = [];
  for (const program of rawProgramRequirements) {
    const blocks: { header: Requirements; courses: Requirements[] }[] = [];
    let currentBlock: Requirements[] = [];
    let header = program.requirements[0];
    program.requirements.shift();

    for (const requirements of program.requirements) {
      if (requirements.areaHeader !== undefined && requirements.areaHeader[0].match("Area A")) {
        blocks.push({ header: header, courses: currentBlock });
        reqBlocks.push({ programId: program.id, blocks: blocks });
        break;
      }
      if (
        (requirements.areaHeader !== undefined &&
          (requirements.areaHeader[0].match("SUPPORT COURSES") ||
            requirements.areaHeader[0].match("GENERAL EDUCATION") ||
            requirements.areaHeader[0].match("FREE ELECTIVES"))) ||
        (requirements.courseListComment !== undefined && requirements.courseListComment.match("Total Units"))
      ) {
        blocks.push({ header: header, courses: currentBlock });
        currentBlock = [];
        header = requirements;
        continue;
      }
      if (requirements === program.requirements[program.requirements.length - 1]) {
        currentBlock.push(requirements);
        blocks.push({ header: header, courses: currentBlock });
        reqBlocks.push({ programId: program.id, blocks: blocks });
        currentBlock = [];
        continue;
      }
      currentBlock.push(requirements);
    }
  }

  const content = JSON.stringify(reqBlocks, null, 2);
  fs.writeFileSync(`${appDir}/../textOutputs/testingReq.json`, content);
}

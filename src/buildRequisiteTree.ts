import fs from "node:fs";
import { dirname } from "path";

const appDir = dirname(import.meta.filename);

export interface CourseBefore {
  prefix: string;
  number: string;
  name: string;
  units: string;
  terms: ("TBD" | "F" | "W" | "SP" | "SU")[];
  crnc: boolean;
  prerequisite?: string;
  concurrent?: string;
  recommended?: string;
  corequisite?: string;
  crosslisted?: [string, string];
  ge?: string;
  description: string;
}

export interface Course {
  prefix: string;
  number: string;
  name: string;
  units: string;
  terms: ("TBD" | "F" | "W" | "SP" | "SU")[];
  crnc?: boolean;
  prerequisite?: Operator | { prefix: string; number: string } | string | GE;
  concurrent?: string;
  recommended?: string;
  corequisite?: string;
  crosslisted?: [string, string];
  ge?: string;
  description: string;
}

export interface GE {
  area: string;
  upperDiv?: boolean;
  complete?: boolean;
  needed?: number;
}

export interface Operator {
  type: "AND" | "OR";
  left: Operator | { prefix: string; number: string } | string | GE;
  right: Operator | { prefix: string; number: string } | string | GE;
}

courseReqs();

function courseReqs() {
  const courses = JSON.parse(
    fs.readFileSync(`${appDir}/../textOutputs/reqsWithCourses.json`, "utf8")
  ) as CourseBefore[];
  const fixedCourses: Course[] = courses;
  for (const i in courses) {
    const singleCoursePrereq = courses[i].prerequisite!.match(
      /^(?:([A-Z]{2,4})(?:\s|\/[A-Z]+\s)(\d{2,3}))(?:$|[A-Z\s\d\/]+?$)/
    );
    const courseAndOrCourse = courses[i].prerequisite!.match(
      /^(?:([A-Z]+?)\/.*?(\d{2,3})|([A-Z]+?)\s(\d{2,3})|([A-Z]+?)\s(\d{2,3})) (and|or|&) (?:([A-Z]+?)\/.*?(\d{2,3})|([A-Z]+?)\s(\d{2,3})|([A-Z]+?)\s(\d{2,3}))$/
    );
    const courseAndOrString = courses[i].prerequisite!.match(
      /^(?:(?:([A-Z]{2,4})\s(\d{2,3})|(^[A-Z]+?)\/[A-Z\s]*?(\d{2,3})|(^[A-Z]+?)\s(\d{2,3})),? (and|or) ((?:(?:consent|permission) of instructor)|(?:graduate|senior|junior|S?s?ophomore) standing(?: in Mathematics)?))$/
    );

    const hassemicoma = courses[i].prerequisite!.match(/;|,/);
    if (singleCoursePrereq) {
      fixedCourses[i].prerequisite = { prefix: singleCoursePrereq[1], number: singleCoursePrereq[2] };
    } else if (courseAndOrCourse) {
      const matches = [];
      for (const match of courseAndOrCourse) {
        if (match !== undefined) {
          matches.push(match);
        }
      }
      if (matches[3] !== "and" && matches[3] !== "or") {
        fixedCourses[i].prerequisite = {
          type: "AND",
          left: { prefix: matches[1], number: matches[2] },
          right: { prefix: matches[4], number: matches[5] },
        };
      } else {
        fixedCourses[i].prerequisite = {
          type: matches[3].toUpperCase() as "AND" | "OR",
          left: { prefix: matches[1], number: matches[2] },
          right: { prefix: matches[4], number: matches[5] },
        };
      }
    } else if (courseAndOrString) {
      const matches = [];
      for (const match of courseAndOrString) {
        if (match !== undefined) {
          matches.push(match);
        }
      }
      fixedCourses[i].prerequisite = {
        type: matches[3].toUpperCase() as "AND" | "OR",
        left: { prefix: matches[1], number: matches[2] },
        right: matches[4],
      };
    } else if (hassemicoma) {
      console.log(fixedCourses[i].prerequisite);
    } else {
    }
  }
}

function splitByStringGECourse() {
  const courses = JSON.parse(fs.readFileSync(`${appDir}/../textOutputs/courses.json`, "utf8")) as CourseBefore[];
  const reqsWithGE: Course[] = [];
  const reqsWithCourse: Course[] = [];
  const reqsWithString: Course[] = [];
  for (const i in courses) {
    const prereqs = courses[i].prerequisite;
    if (prereqs) {
      const hasGE = prereqs.match(/(.*(?:GE (?:Area|Upper-Division)?|Completion of Area D1)+?.*)/);
      const hasCourse = prereqs.match(/(.*(?:[A-Z]{2,4}\s\d{2,3})+?.*)/);
      if (hasGE) {
        reqsWithGE.push(courses[i]);
      } else if (hasCourse) {
        reqsWithCourse.push(courses[i]);
      } else {
        reqsWithString.push(courses[i]);
      }
    }
  }
  fs.writeFileSync(`${appDir}/../textOutputs/reqsWithGEs.json`, JSON.stringify(reqsWithGE, null, 2));
  fs.writeFileSync(`${appDir}/../textOutputs/reqsWithCourses.json`, JSON.stringify(reqsWithCourse, null, 2));
  fs.writeFileSync(`${appDir}/../textOutputs/reqsWithStrings.json`, JSON.stringify(reqsWithString, null, 2));
}

function GEReqs() {
  const courses = JSON.parse(fs.readFileSync(`${appDir}/../textOutputs/reqsWithGEs.json`, "utf8")) as CourseBefore[];
  const fixedCourses: Course[] = courses;
  for (const i in courses) {
    const singleCompleteGE = courses[i].prerequisite!.match(/(?:Completion of GE Area ([ABCDEF\d]+))\s?$/);
    if (singleCompleteGE) {
      fixedCourses[i].prerequisite = { area: singleCompleteGE[1], complete: true };
      console.log(fixedCourses[i]);
    }
  }
}

function stringReqs() {
  const courses = JSON.parse(
    fs.readFileSync(`${appDir}/../textOutputs/reqsWithStrings.json`, "utf8")
  ) as CourseBefore[];
  const fixedCourses: Course[] = courses;
  for (const i in courses) {
  }
}

function onlyStringReq(prereqs: string) {
  const regExps = [/^(Consent of instructor)$/, /^(Graduate standing|Senior standing|Junior standing)$/];
  for (const exp of regExps) {
    const captureGroups = prereqs.match(exp);
    if (captureGroups) {
      return {
        prerequisite: captureGroups[1],
      };
    }
  }
}

function onlyOneCourse(prereqs: string) {
  const course = prereqs.match(/^([A-Z]{2,4})\s(\d{2,3})$/);
  if (course) {
    return {
      prerequisite: course[1] + course[2],
    };
  }
}

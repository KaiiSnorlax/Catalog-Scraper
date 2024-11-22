import fs from "node:fs";
import { dirname } from "path";

const appDir = dirname(import.meta.filename);
const courses = JSON.parse(fs.readFileSync(`${appDir}/../textOutputs/reqsWithGE.json`, "utf8")) as CourseBefore[];

export interface CourseBefore {
  id: string;
  name: string;
  units: string;
  terms: ("TBD" | "F" | "W" | "SP" | "SU")[];
  crnc?: boolean;
  prerequisite?: string;
  concurrent?: string;
  recommended?: string;
  corequisite?: string;
  crosslisted?: [string, string];
}

export interface Course {
  id: string;
  name: string;
  units: string;
  terms: ("TBD" | "F" | "W" | "SP" | "SU")[];
  crnc?: boolean;
  prerequisite?: Operator | Course["id"] | string | GE;
  concurrent?: string;
  recommended?: string;
  corequisite?: string;
  crosslisted?: [string, string];
  ge?: string;
}

export interface GE {
  area: string;
  upperDiv?: boolean;
  complete?: boolean;
  needed?: number;
}

export interface Operator {
  type: "AND" | "OR";
  left: Operator | Course["id"] | string | GE;
  right: Operator | Course["id"] | string | GE;
}

function fixData(courses: CourseBefore[]) {
  for (const course of courses) {
    let prereqs = course.prerequisite;
    if (prereqs !== undefined) {
      prereqs = prereqs
        .replace(/\(GE Area.*or earlier catalogs\)/, "")
        .replace(/\(or in.*earlier catalogs\)/, "")
        .replace(/\(GE Area.*earlier catalog.?\)/, "")
        .replace(/\swith a? ?grades? of a? ?C- or better/g, "")
        .replace(/\((?:with )?C-.*\)/, "")
        .replace(/and a grade of C- or better in/, "and");
      course.prerequisite = prereqs;
    }
  }
  fs.writeFileSync(`${appDir}/../textOutputs/reqsWithCoursess.json`, JSON.stringify(courses, null, 2));
}

fixData(courses);

function completionOneGE(prereqs: string): GE | undefined {
  const regMatch = prereqs.match(/(?:Completion of GE Area ([ABCDEF\d]+))\s?$/);
  if (regMatch) {
    return {
      area: regMatch[1],
      complete: true,
    };
  }
}

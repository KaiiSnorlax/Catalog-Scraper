import fs from "node:fs";
import { dirname } from "path";
import { rawCourse } from "./courses.js";

const appDir = dirname(import.meta.filename);
const rawCourses = JSON.parse(fs.readFileSync(`${appDir}/../textOutputs/rawCourses.json`, "utf8")) as rawCourse[];

export interface Course {
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

cleanCourses(rawCourses);

function cleanCourses(rawCourses: rawCourse[]) {
  const cleanedCourses: Course[] = [];
  for (const rawCourse of rawCourses) {
    cleanedCourses.push({
      ...parseTitle(rawCourse.title),
      units: rawCourse.units,
      ...parseAssorted(rawCourse.assorted),
      ...parseRequisites(rawCourse.requisites),
      ...parseDescription(rawCourse.description),
    });
  }

  fs.writeFileSync(`${appDir}/../textOutputs/courses.json`, JSON.stringify(cleanedCourses, null, 2));
}

function parseTitle(title: string) {
  const course = title.replace(/\.$/, "").split(/\. /);
  const coursePrefixNumber = course[0].match(/^([A-Z]{2,4})\s(\d{2,3})/);
  const courseName = course[1];

  if (!coursePrefixNumber) {
    throw Error(`Couldn't get prefix and/or number from ${title}`);
  }

  return { prefix: coursePrefixNumber[1], number: coursePrefixNumber[2], name: courseName };
}

function parseAssorted(assorted: string[]) {
  const terms = assorted[0]?.match(/Term Typically Offered: (.+)/)?.[1].split(/, ?/);
  if (!terms) {
    return {
      terms: ["TBD"] as ("TBD" | "F" | "W" | "SP" | "SU")[],
      crnc: assorted[1] === "CR/NC",
    };
  }
  for (const term of terms) {
    if (term === "TBD" || term === "F" || term === "W" || term === "SP" || term === "SU") {
      return {
        terms: terms as ("TBD" | "F" | "W" | "SP" | "SU")[],
        crnc: assorted[1] === "CR/NC",
      };
    }
  }

  throw Error(`Error in parsing term for |${terms}|`);
}

function parseRequisites(requisites: string | undefined) {
  const requisite: {
    prerequisite?: string;
    concurrent?: string;
    recommended?: string;
    corequisite?: string;
  } = {};

  if (requisites === undefined) {
    return;
  }

  const regMatches = [
    ...requisites.matchAll(
      /(Prerequisite|Concurrent|Co-requisite|Recommended|Corequisite): ?((?:.(?!Prerequisite|Concurrent|Co-requisite|Recommended|Corequisite))*)/g
    ),
  ];

  for (const regMatch of regMatches) {
    const courseReq = regMatch[1].toLowerCase();
    if (courseReq === "co-requisite") {
      requisite["corequisite"] = regMatch[2]
        .replace(/\.*$/, "")
        .replace(/\(.*?catalogs?\.?\)/g, "")
        .replace(/(?:with.*?C- or (?:better|higher))/g, "")
        .replace(/\(C-.*\)/g, "")
        .replace(/(?: ?a?A?|,? ?and|with a minimum) grade of C- or (?:better)?,?/g, "")
        .replace(/  /g, " ")
        .replace(/ ; /g, "; ")
        .replace(/ ,/g, ",")
        .replace(/ or equivalent/, "")
        .trim();
    } else if (
      courseReq === "prerequisite" ||
      courseReq === "concurrent" ||
      courseReq === "recommended" ||
      courseReq === "corequisite"
    ) {
      requisite[courseReq] = regMatch[2]
        .replace(/\.*$/, "")
        .replace(/\(.*?catalogs?\.?\)/g, "")
        .replace(/(?:with.*?C- or (?:better|higher))/g, "")
        .replace(/\(C-.*\)/g, "")
        .replace(/(?: ?a?A?|,? ?and|with a minimum) grade of C- or (?:better)?,?/g, "")
        .replace(/  /g, " ")
        .replace(/ ; /g, "; ")
        .replace(/ ,/g, ",")
        .replace(/ or equivalent/, "")
        .trim();
    }
  }

  return requisite;
}

function parseDescription(description: string) {
  const crossGEDesc: { crosslisted?: [string, string]; ge?: string; description: string } = {
    description: description.replace("  ", " "),
  };
  const regMatches = [...description.matchAll(/(Crosslisted as|Fulfills GE) ?((?:.(?!Crosslisted as|Fulfills GE))*)/g)];

  for (const regMatch of regMatches) {
    if (regMatch[1] === "Crosslisted as") {
      const parentCourse = regMatch[2].match(/(^[A-Z]+?)\/.*?(\d{2,3})|(^[A-Z]+?)\s(\d{2,3})/);
      if (parentCourse === null) {
        throw Error(`Error getting crosslisted course on ${regMatch[2]}`);
      }
      crossGEDesc["crosslisted"] = [parentCourse[1], parentCourse[2]];
    } else if (regMatch[1] === "Fulfills GE") {
      crossGEDesc["ge"] = regMatch[2]
        .replace(/\.*$/, "")
        .replace(/\(.*?catalogs?\.?\)/g, "")
        .replace(/(?:with.*?C- or (?:better|higher))/g, "")
        .replace(/(;.*C-.*GE A?a?rea)/g, "")
        .replace(/  /g, " ")
        .replace(/ ; /g, "; ")
        .replace(/ ,/g, ",")
        .trim();
    }
  }

  if (Object.keys(crossGEDesc).length === 0) {
    return crossGEDesc;
  }

  return crossGEDesc;
}

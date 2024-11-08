import { getDocument } from "./utils/makeRequests.js";

export interface Course {
  prefix: string;
  number: string;
  name: string;
  units: string;
  terms: ("TBD" | "F" | "W" | "SP" | "SU")[];
  crnc?: boolean;
  prerequisite?: string;
  concurrent?: string;
  recommended?: string;
  corequisite?: string;
  crosslisted?: [string, string];
  ge?: string;
}
export async function getCourses(url: string) {
  const document = await getDocument(url);
  const courseBlocks = [...document.querySelectorAll("div.courseblock")];
  const courses: Course[] = [];

  for (const courseBlock of courseBlocks) {
    courses.push({
      ...(await getCourseTitle(courseBlock)),
      ...(await getCourseMetaData(courseBlock)),
      ...(await getCourseDescription(courseBlock)),
    });
  }

  console.log(`DONE! ${url}`);
  return courses;
}

//
async function getCourseTitle(courseBlock: Element) {
  const courseTitle = [...courseBlock.querySelectorAll("p.courseblocktitle strong")]
    .map((elem) =>
      [...elem.childNodes]
        .filter((child) => child.nodeType === 3)
        .map((child) => child.textContent?.trim())
        .join("")
    )
    .join()
    .replace(/\.$/, "")
    .split(/\. /);

  const coursePrefixNumber = courseTitle[0].match(/^([A-Z]{2,4})\s(\d{2,3})/);

  const courseUnits = [...courseBlock.querySelectorAll("p.courseblocktitle strong span.courseblockhours")]
    .map((elem) => elem.textContent?.trim().replace(/ units?/, ""))
    .join();

  if (courseTitle === null || courseUnits === null) {
    throw Error(`null value when retreiving courseblocktitle in courseblock -> ${courseBlock}`);
  }

  if (coursePrefixNumber === null) {
    throw Error(`Error getting prefix and number for ${courseTitle}`);
  }

  return {
    prefix: coursePrefixNumber[1],
    number: coursePrefixNumber[2],
    name: courseTitle[1],
    units: courseUnits[0]!,
  };
}

async function getCourseMetaData(courseBlock: Element) {
  const courseAssorted = [...courseBlock.querySelectorAll("div.courseextendedwrap p.noindent")].map(
    (elem) => elem.textContent!
  );

  // Gets Prerequisites, Corequisites, Concurrent, and Reccomended on applicable courses
  const courseRequisite = [...courseBlock.querySelectorAll("div.courseextendedwrap p:not(.noindent)")]
    .map((elem) => elem.textContent)
    .join();

  return { ...parseAssorted(courseAssorted), ...parseRequisites(courseRequisite) };
}

function parseAssorted(courseAssorted: string[]) {
  const terms = courseAssorted[0]?.match(/Term Typically Offered: (.+)/)?.[1].split(/, ?/);
  if (!terms) {
    return {
      terms: ["TBD"] as ("TBD" | "F" | "W" | "SP" | "SU")[],
      crnc: courseAssorted[1] === "CR/NC",
    };
  }
  for (const term of terms) {
    if (term === "TBD" || term === "F" || term === "W" || term === "SP" || term === "SU") {
      return {
        terms: terms as ("TBD" | "F" | "W" | "SP" | "SU")[],
        crnc: courseAssorted[1] === "CR/NC",
      };
    }
  }

  throw Error(`Error in parsing term for |${terms}|`);
}

function parseRequisites(courseRequisite: string) {
  const requisite: {
    prerequisite?: string;
    concurrent?: string;
    recommended?: string;
    corequisite?: string;
  } = {};
  const regMatches = [
    ...courseRequisite.matchAll(
      /(Prerequisite|Concurrent|Recommended|Corequisite): ?((?:.(?!Prerequisite|Concurrent|Recommended|Corequisite))*)/g
    ),
  ];

  for (const regMatch of regMatches) {
    const courseReq = regMatch[1].toLowerCase();
    if (
      courseReq === "prerequisite" ||
      courseReq === "concurrent" ||
      courseReq === "recommended" ||
      courseReq === "corequisite"
    ) {
      requisite[courseReq] = regMatch[2].replace(/\.*$/, "");
    }
  }

  if (Object.keys(requisite).length === 0) {
    return;
  }

  return requisite;
}

async function getCourseDescription(courseBlock: Element) {
  const courseDescription = [...courseBlock.querySelectorAll("div.courseblockdesc p")]
    .map((elem) => elem.textContent)
    .join();
  const description: Record<string, string> = { description: courseDescription };

  return { ...description, ...parseDescription(courseDescription) };
}

function parseDescription(description: string) {
  const crossAndGE: { crosslisted?: [string, string]; ge?: string } = {};
  const regMatches = [...description.matchAll(/(Crosslisted as|Fulfills GE) ?((?:.(?!Crosslisted as|Fulfills GE))*)/g)];

  for (const regMatch of regMatches) {
    if (regMatch[1] === "Crosslisted as") {
      const parentCourse = regMatch[2].match(/(^[A-Z]+?)\/.*?(\d{2,3})|(^[A-Z]+?)\s(\d{2,3})/);
      if (parentCourse === null) {
        throw Error(`Error getting crosslisted course on ${regMatch[2]}`);
      }
      crossAndGE["crosslisted"] = [parentCourse[1], parentCourse[2]];
    } else if (regMatch[1] === "Fulfills GE") {
      crossAndGE["ge"] = regMatch[2].trim().replace(/\.*$/, "");
    }
  }

  if (Object.keys(crossAndGE).length === 0) {
    return;
  }
  return crossAndGE;
}

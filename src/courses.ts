import { getDocument } from "./utils/makeRequests.js";

export interface rawCourse {
  title: string;
  units: string;
  assorted: string[];
  requisites?: string;
  description: string;
}

export async function getCourses(url: string) {
  const document = await getDocument(url);
  const courseBlocks = [...document.querySelectorAll("div.courseblock")];
  const courses: rawCourse[] = [];

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

async function getCourseTitle(courseBlock: Element) {
  const courseTitle = [...courseBlock.querySelectorAll("p.courseblocktitle strong")]
    .map((elem) =>
      [...elem.childNodes]
        .filter((child) => child.nodeType === 3)
        .map((child) => child.textContent?.trim())
        .join("")
    )
    .join();

  const courseUnits = [...courseBlock.querySelectorAll("p.courseblocktitle strong span.courseblockhours")]
    .map((elem) => elem.textContent?.trim().replace(/ units?/, ""))
    .join();

  if (courseTitle === null || courseUnits === null) {
    throw Error(`null value when retreiving courseblocktitle in courseblock -> ${courseBlock}`);
  }

  return {
    title: courseTitle,
    units: courseUnits[0]!,
  };
}

async function getCourseMetaData(courseBlock: Element) {
  const courseAssorted = [...courseBlock.querySelectorAll("div.courseextendedwrap p.noindent")].map(
    (elem) => elem.textContent!
  );

  // Gets Prerequisites, Corequisites, Concurrent, and Reccomended on applicable courses
  const courseRequisites = [...courseBlock.querySelectorAll("div.courseextendedwrap p:not(.noindent)")]
    .map((elem) => elem.textContent)
    .join();

  if (courseRequisites.length > 0 && courseAssorted.length > 0) {
    return { assorted: courseAssorted, requisites: courseRequisites };
  }

  return { assorted: courseAssorted };
}

async function getCourseDescription(courseBlock: Element) {
  const courseDescription = [...courseBlock.querySelectorAll("div.courseblockdesc p")]
    .map((elem) => elem.textContent)
    .join();

  return { description: courseDescription };
}

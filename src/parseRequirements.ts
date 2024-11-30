import { Row } from "./programRequirements.js";
import fs from "node:fs";
import { dirname } from "path";
import programs from "../textOutputs/rawProgramRequirements.json";

const appDir = dirname(import.meta.filename);
const selectSectionRegex = /^Select(?:\sone\ssequence)?\sfrom\sthe\sfollowing:?\s?(.+)?$/;

class ProgramRows {
  private rows: Row[];
  private pointer = 0;

  constructor(rows: Row[]) {
    this.rows = rows;
  }

  consume(): Row | undefined {
    return this.rows[this.pointer++];
  }

  peek(): Row | undefined {
    return this.rows[this.pointer];
  }
}

interface Section {
  id: number;
  program: string;
  requirements: Header[][];
}

interface Header {
  section: string[] | undefined;
  requirements: Requirement[];
}

interface Requirement {
  units: string | undefined;
  courses: (Course | Comment)[][];
}

interface Course {
  type: "course";
  name: string;
}

interface Comment {
  type: "comment";
  name: string;
}

const sections: Section[] = programs.map((program) => {
  const programRequirements = program.tables.map((table) => {
    const rows = new ProgramRows(table as Row[]);

    const tableRequirements = [];
    while (rows.peek()) {
      tableRequirements.push(parseHeader(rows));
    }

    return tableRequirements;
  });

  return {
    id: program.id,
    program: program.program,
    requirements: programRequirements,
  };
});

const content = JSON.stringify(sections, null, 2);
fs.writeFileSync(`${appDir}/../textOutputs/parsedProgramRequirements.json`, content);

function parseHeader(rows: ProgramRows): Header {
  const first = rows.peek();

  if (!first) {
    throw Error(`Unexpected end of input`);
  }

  const header = first.type === "header" ? rows.consume()! : undefined;

  if (header && header.type !== "header") {
    throw Error(`Expected header but got: ${rows.peek()?.type}`);
  }

  const sectionRequirements: Requirement[] = [];
  while (true) {
    const next = rows.peek();

    if (!next || next.type === "header") {
      return {
        section: header?.areaHeader,
        requirements: sectionRequirements,
      };
    } else if (next.type === "course") {
      sectionRequirements.push({
        units: next.hoursCol,
        courses: parseCourse(rows),
      });
    } else if (next.type === "comment") {
      sectionRequirements.push({
        units: next.hoursCol,
        courses: parseComment(rows),
      });
    } else {
      throw Error(`Unexpected type: ${next.type}`);
    }
  }
}

function formatCourseName(courseName: string) {
  const crosslisted = courseName.match(/\/([A-Z]+\s\d+)$/i);
  if (crosslisted) {
    return crosslisted[1];
  }

  const crosslisted2 = courseName.match(/^([A-Z]+\s\d+)\//i);
  if (crosslisted2) {
    return crosslisted2[1];
  }

  return courseName;
}

function parseCourse(rows: ProgramRows): (Course | Comment)[][] {
  const course = rows.consume();

  if (!course) {
    throw Error("Unexpected end of input");
  }

  if (course.type !== "course" && course.type !== "orcourse") {
    throw Error(`Expected course but got: ${course.type}`);
  }

  const courseData: Course[] = course.codeCol
    .match(/^(?:or\s)?(.*)$/)![1]
    .split(/\s*&\s*/)
    .map((it) => ({
      type: "course",
      name: formatCourseName(it),
    }));

  const next = rows.peek();
  if (next?.type === "orcourse") {
    return [courseData, ...parseCourse(rows)];
  }

  return [courseData];
}

function parseComment(rows: ProgramRows): (Course | Comment)[][] {
  const comment = rows.consume();

  if (!comment) {
    throw Error("Unexpected end of input");
  }

  if (comment.type !== "comment") {
    throw Error(`Expected comment but got: ${comment.type}`);
  }

  const selectBlock = comment.courseListComment.match(selectSectionRegex);
  if (selectBlock) {
    const courses: (Course | Comment)[][] = [];
    while (true) {
      const next = rows.peek();
      if (!next || next.type === "header" || next.hoursCol) {
        return courses;
      } else if (next.type === "course") {
        courses.push(...parseCourse(rows));
      } else if (next.type === "comment" && next.courseListComment === "or") {
        rows.consume();
      } else if (next.type === "comment") {
        courses.push(...parseComment(rows));
      } else {
        throw Error(`Unexpected type: ${next.type}`);
      }
    }
  } else {
    return [
      [
        {
          type: "comment",
          name: comment.courseListComment,
        },
      ],
    ];
  }
}

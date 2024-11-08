import fs from "node:fs";
import { dirname } from "path";
import { Course } from "./courses.js";

const appDir = dirname(import.meta.filename);

const departments = JSON.parse(fs.readFileSync(`${appDir}/../textOutputs/courses.json`, "utf8"));

for (const department of departments) {
  for (const course of department) {
    let prereqs = course["prerequisite"];
    if (prereqs !== undefined) {
      prereqs = prereqs
        .replace(/\(GE Area.*or earlier catalogs\)/, "")
        .replace(/\(or in.*earlier catalogs\)/, "")
        .replace(/\(GE Area.*earlier catalog.?\)/, "")
        .replace(/\swith a? ?grades? of a? ?C- or better/g, "")
        .replace(/\((?:with )?C-.*\)/, "")
        .replace(/and a grade of C- or better in/, "and");
      const consentInstructor = prereqs.match(/^Consent of instructor$/);
      if (consentInstructor) {
        console.log(consentInstructor[1]);
      }
    }
  }
}

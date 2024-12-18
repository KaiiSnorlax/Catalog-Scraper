import { getDepartments } from "./departments.js";
import { getCourses } from "./courses.js";
import fs from "node:fs";
import { dirname } from "path";
import { getDocument } from "./utils/makeRequests.js";

const appDir = dirname(import.meta.filename);

const departments = await getDepartments("https://catalog.calpoly.edu/coursesaz/");
const promises = [];

for (const department of departments) {
  promises.push(getCourses(`https://catalog.calpoly.edu/coursesaz/${department.prefix.toLowerCase()}`));
}

const courses = await Promise.all(promises);
const content = JSON.stringify(courses.flat(), null, 2);

fs.writeFileSync(`${appDir}/../textOutputs/rawCourses.json`, content);

getDocument("https://catalog.calpoly.edu/programsaz/");

import { getDocument } from "./utils/makeRequests.js";

class Department {
  name: string;
  prefix: string;

  constructor(name: string, prefix: string) {
    this.name = name;
    this.prefix = prefix;
  }
}

export async function getDepartments(url: string) {
  const document = await getDocument(url);
  const elements = [...document.querySelectorAll("a.sitemaplink")].map((elem) => elem.textContent);
  const departments = [];

  for (const i in elements) {
    const element = elements[i];
    if (element === null) {
      throw Error(`null value when retreiving sitemaplink -> located at element[${i}]`);
    }

    const captureGroups = element.match(/^([\w\s\-:,\']+?)\s\(([A-Z]{2,4})\)/);
    if (!captureGroups) {
      throw Error(`regex failed on -> ${element}`);
    }
    const department: Department = new Department(captureGroups[1], captureGroups[2]);

    departments.push(department);
  }
  return departments;
}

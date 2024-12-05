import * as path from "jsr:@std/path";
import { TextLineStream } from "jsr:@std/streams";

// ___________________________________ //

const data = await openFile("data.txt");
console.log(await computeAnswer(data));

// ___________________________________ //

type IReport = number[];

async function computeAnswer(file: Deno.FsFile) {
  const readable = file.readable
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new TextLineStream());

  let count = 0;
  for await (const line of readable) {
    const report = getReport(line);
    if (isDampenedSafe(report)) count += 1;
  }
  return count;
}

function isDampenedSafe(report: IReport): boolean {
  if (!isSafe(Array.from(report))) {
    let index = report.length - 1;
    while (index >= 0) {
      const newReport = report.toSpliced(index, 1);
      if (isSafe(newReport)) return true;
      index = index - 1;
    }
    return false;
  }

  return true;
}

function isSafe(report: IReport): boolean {
  let lastEl;
  const growing = isGrowing(report);
  while ((lastEl = report.pop())) {
    if (!meetsRules(growing, lastEl, report.at(-1))) return false;
  }
  return true;
}

function isGrowing([a, b, ..._]: IReport): boolean {
  return a < b;
}

function meetsRules(growing: boolean, a: number, b?: number) {
  if (!b) return true;
  if (a === b) return false;

  const maxDiff = 3;
  const delta = a - b;

  if (Math.abs(delta) > maxDiff) return false;

  return growing ? 0 < delta : 0 > delta;
}

function getReport(line: string): IReport {
  return line.split(" ").map(Number);
}

async function openFile(filename: string) {
  const dirname = import.meta.dirname;
  if (!dirname) throw new Error("Dirname is not defined for some reason");
  return await Deno.open(path.join(dirname, filename));
}

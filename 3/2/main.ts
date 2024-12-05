import { TextLineStream } from "jsr:@std/streams";
import * as path from "jsr:@std/path";

// ___________________________________ //

const data = await openFile("data.txt");
console.log(await computeAnswer(data));

// ___________________________________ //

interface Chunk {
  index: number;
  enabled: boolean;
}

async function computeAnswer(file: Deno.FsFile) {
  const readable = file.readable
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new TextLineStream());

  let sum = 0;
  for await (const line of readable) {
    const toggleChunks = getToggleChunks(line);
    const muls = [...line.matchAll(/mul\((?<X>\d{1,3}),(?<Y>\d{1,3})\)/g)].map(
      (mul) => ({
        ...mul,
        enabled: toggleChunks.findLast((chunk) => chunk.index < mul.index)
          ?.enabled ?? false,
      }),
    );

    for (const mul of muls) {
      if (!mul.enabled) continue;

      const { X, Y } = mul.groups || {};
      sum += Number(X) * Number(Y);
    }
  }
  return sum;
}

function getInstructionIndices(line: string, regex: RegExp) {
  return [...line.matchAll(new RegExp(regex.source, regex.flags))].map((
    { index },
  ) => index);
}

function getChunk(index: number, enabled: boolean): Chunk {
  return ({
    index,
    enabled,
  });
}

function getToggleChunks(line: string) {
  // At the beginning of the program, mul instructions are enabled.
  const enabled = [0, ...getInstructionIndices(line, /do\(\)/g)].map(
    (i) => getChunk(i, true),
  );
  const disabled = getInstructionIndices(line, /don't\(\)/g).map(
    (i) => getChunk(i, false),
  );
  return [...enabled, ...disabled].sort((a, b) => a.index - b.index);
}

async function openFile(filename: string) {
  const dirname = import.meta.dirname;
  if (!dirname) throw new Error("Dirname is not defined for some reason");
  return await Deno.open(path.join(dirname, filename));
}

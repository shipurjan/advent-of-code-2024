import { TextLineStream } from 'jsr:@std/streams'
import * as path from 'jsr:@std/path'

// ___________________________________ //

const data = await openFile('data.txt')
console.log(await computeAnswer(data))

// ___________________________________ //

async function computeAnswer(file: Deno.FsFile) {
  const readable = file.readable
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new TextLineStream())

  for await (const line of readable) {
    console.log(line)
  }
}

async function openFile(filename: string) {
  const dirname = import.meta.dirname
  if (!dirname) throw new Error('Dirname is not defined for some reason')
  return await Deno.open(path.join(dirname, filename))
}

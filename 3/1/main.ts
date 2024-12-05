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

  let sum = 0
  for await (const line of readable) {
    const matches = line.matchAll(/mul\((?<X>\d{1,3}),(?<Y>\d{1,3})\)/g)
    for (const match of matches) {
      const { X, Y } = match.groups || {}
      if (X === undefined || Y === undefined) {
        throw new Error(
          `One of the inputs in the ${match[0]} expression is undefined`,
        )
      }
      sum += Number(X) * Number(Y)
    }
  }
  return sum
}

async function openFile(filename: string) {
  const dirname = import.meta.dirname
  if (!dirname) throw new Error('Dirname is not defined for some reason')
  return await Deno.open(path.join(dirname, filename))
}

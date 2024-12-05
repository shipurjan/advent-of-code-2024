import * as path from 'jsr:@std/path'

// ___________________________________ //

const data = await readTextFile('data.txt')
console.log(computeAnswer(data))

// ___________________________________ //

function computeAnswer(data: string) {
  const matches = removeDisabledChunks(data).matchAll(
    /mul\((?<X>\d{1,3}),(?<Y>\d{1,3})\)/g,
  )
  return matches.reduce(
    (prev, { groups: { X, Y } = {} }) => prev + Number(X) * Number(Y),
    0,
  )
}
function removeDisabledChunks(data: string) {
  return data.replace(/don't\(\)[\s\S]*?do\(\)/g, '')
}

async function readTextFile(filename: string) {
  const dirname = import.meta.dirname
  if (!dirname) throw new Error('Dirname is not defined for some reason')
  return await Deno.readTextFile(path.join(dirname, filename))
}

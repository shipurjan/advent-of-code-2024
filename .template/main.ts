import * as path from 'jsr:@std/path'

// ___________________________________ //

const file = await openFile('data.txt')
console.log(await computeAnswer(file))

// ___________________________________ //

async function computeAnswer(file: Deno.FsFile) {
  void file
  return await Promise.resolve(null)
}

async function openFile(filename: string) {
  const dirname = import.meta.dirname
  if (!dirname) throw new Error('Dirname is not defined for some reason')
  return await Deno.open(path.join(dirname, filename))
}

import * as path from 'jsr:@std/path'

// ___________________________________ //

const file = await openFile('data.txt')
console.log(await computeAnswer(file))

// ___________________________________ //

async function computeAnswer(file: Deno.FsFile) {
  const buffer = await getBuffer(file)
  const [left, right] = await getNumberLists(file, buffer)
  return getTotalDistance(left, right)
}

function getTotalDistance(left: number[], right: number[]) {
  if (left.length !== right.length) {
    throw new Error('Wrong data - both lists should be of the same size')
  }

  return left.map((num, i) => Math.abs(num - right[i])).reduce(
    (prev, cur) => prev + cur,
    0,
  )
}

async function getNumberLists(
  file: Deno.FsFile,
  buffer: Uint8Array,
): Promise<[number[], number[]]> {
  const decoder = new TextDecoder()
  const left: number[] = []
  const right: number[] = []

  while (await file.read(buffer)) {
    await file.seek(1, Deno.SeekMode.Current)

    const l = buffer.slice(0, buffer.indexOf(' '.charCodeAt(0)))
    const r = buffer.slice(buffer.lastIndexOf(' '.charCodeAt(0)) + 1)
    left.push(Number(decoder.decode(l)))
    right.push(Number(decoder.decode(r)))
  }

  left.sort()
  right.sort()
  return [left, right]
}

async function getBuffer(file: Deno.FsFile) {
  const tmpBuffer = new Uint8Array(64)
  await file.read(tmpBuffer)
  await file.seek(0, Deno.SeekMode.Start) // ensure not mutated
  return new Uint8Array(tmpBuffer.indexOf('\n'.charCodeAt(0)))
}

async function openFile(filename: string) {
  const dirname = import.meta.dirname
  if (!dirname) throw new Error('Dirname is not defined for some reason')
  return await Deno.open(path.join(dirname, filename))
}

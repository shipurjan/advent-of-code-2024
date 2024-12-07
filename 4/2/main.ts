import { TextLineStream } from 'jsr:@std/streams'
import * as path from 'jsr:@std/path'

const SEARCH_WORD = 'MAS'

// ___________________________________ //

const data = await openFile('data.sample.txt')
console.log(await computeAnswer(data))

// ___________________________________ //

type Axis = string[]

export type Axes = {
  horizontal: Axis
  vertical: Axis
  majorDiagonal: Axis
  minorDiagonal: Axis
}

type DiagMatch = {
  direction: 'major' | 'minor'
  diagIndex: number
  index: number
  input: string
  aIndex: number
}

async function computeAnswer(file: Deno.FsFile) {
  const size = await getWordSearchSize(file)
  const readable = file.readable
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new TextLineStream())

  const axes = await getAxes(readable, size)
  const masMatches = findMasMatches(axes)
  return getXMAScount(masMatches)
}

function getXMAScount(masMatches: DiagMatch[]) {
  console.debug({ masMatches })
}

function getMinorIndexCrossingThrough(
  majorIndex: number,
  aIndex: number,
  size: number,
) {
  return 2 * aIndex + Math.abs(1 + majorIndex - size)
}

function findMasMatches(
  axes: Axes,
) {
  const getDiagMatches = (
    s: string,
    diagIndex: number,
    direction: DiagMatch['direction'],
  ): DiagMatch[] =>
    [...s.matchAll(
      new RegExp(
        `(?=${SEARCH_WORD}|${[...SEARCH_WORD].reverse().join('')})`,
        'g',
      ),
    )].map(({ groups: _, index, input }) => ({
      direction,
      diagIndex,
      index,
      input,
      aIndex: index + 1,
    }))

  return [
    ...axes.majorDiagonal.flatMap((d, i) => getDiagMatches(d, i, 'major')),
    ...axes.minorDiagonal.flatMap((d, i) => getDiagMatches(d, i, 'minor')),
  ]
}

export async function getAxes(
  readable: ReadableStream<string>,
  size: number,
) {
  // cartesian (horizontal or vertical) axis size
  const cSize = size
  // diagonal axis size
  const dSize = 2 * size - 1

  const axes: Axes = {
    horizontal: [],
    vertical: Array.from<string>({ length: cSize }).fill(''),
    majorDiagonal: Array.from<string>({ length: dSize }).fill(''),
    minorDiagonal: Array.from<string>({ length: dSize }).fill(''),
  }
  for await (const line of readable) {
    axes.horizontal.push(line)
    for (let i = 0; i < cSize; i++) {
      axes.vertical[i] += line[i]
    }
  }

  const getDiagonal = (n: number, direction: 'major' | 'minor') => {
    if (n < 1 || n > dSize) {
      throw new Error(
        `There are ${dSize} diagonals in this word search; to get the nth array n must be in range between 1 and ${dSize}, but got ${n}`,
      )
    }

    const getLetterAt = (x: number, y: number) => {
      return axes.horizontal?.[x]?.[y]
    }

    const getDiagonalLength = (x: number) =>
      Math.round(cSize - Math.abs(x - cSize))

    const getNextPosition = (
      position: [number, number],
    ): typeof position => [
      position[0] + (direction === 'major' ? 1 : -1),
      position[1] + 1,
    ]

    const initialPosition: [number, number] = [
      direction === 'major'
        ? Math.max(cSize - n, 0)
        : Math.min(n - 1, cSize - 1),
      Math.max(n - cSize, 0),
    ]

    return Array.from<undefined>({ length: getDiagonalLength(n) }).reduce(
      ({ position, value }) => ({
        value: value + getLetterAt(...position),
        position: getNextPosition(position),
      }),
      {
        position: initialPosition,
        value: '',
      },
    ).value
  }

  for (let i = 0; i < dSize; i++) {
    axes.majorDiagonal[i] = getDiagonal(i + 1, 'major')
    axes.minorDiagonal[i] = getDiagonal(i + 1, 'minor')
  }

  return axes
}

export async function getWordSearchSize(file: Deno.FsFile) {
  const buffer = new Uint8Array(256)
  await file.read(buffer)
  const size = buffer.findIndex((char) => char === '\n'.codePointAt(0))
  await file.seek(0, Deno.SeekMode.Start) // ensure not mutated
  return size
}

export async function openFile(filename: string) {
  const dirname = import.meta.dirname
  if (!dirname) throw new Error('Dirname is not defined for some reason')
  return await Deno.open(path.join(dirname, filename))
}

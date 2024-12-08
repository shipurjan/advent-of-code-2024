import { TextLineStream } from 'jsr:@std/streams'
import * as path from 'jsr:@std/path'

const SEARCH_WORD = 'MAS'

// ___________________________________ //

const data = await openFile('data.txt')
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
  return getXMAScount(masMatches, size)
}

function getXMAScount(masMatches: DiagMatch[], size: number) {
  let count = 0
  const [major, minor] = bifilter(masMatches, (m) => m.direction === 'major')
  for (const mj of major) {
    const sharedMinorIndex = getMinorIndexCrossingThrough(
      mj.diagIndex,
      mj.aIndex,
      size,
    )

    const common = minor.filter((mn) => mn.diagIndex === sharedMinorIndex)
    if (!common.length) continue

    if (common.some((mn) => isSameLocation(mj, mn, size))) {
      count += 1
    }
  }
  return count
}

function isSameLocation(mj: DiagMatch, mn: DiagMatch, size: number) {
  const map = getYHashMap(size)
  const x = mj.diagIndex + 1
  const y = mj.aIndex
  const mnDiagIndex = 2 * y + Math.abs(size - x)
  const mnAIndex = (() => {
    const [result] = Object.entries(map).find(([, inputs]) =>
      inputs.some(([X, Y]) => x === X && y === Y)
    )!
    return Number(result)
  })()
  return mnDiagIndex === mn.diagIndex && mnAIndex === mn.aIndex
}

function getYHashMap(size: number) {
  const triangleArr: [number, number][][] = []
  for (let i = 0; i < size * 2; i++) {
    triangleArr.push([])
    for (let j = 0; j < -Math.abs(i - size) + size; j++) {
      triangleArr[i - 1].push([i, j])
    }
  }
  triangleArr.pop()

  const squareArr: [number, number][][] = []
  for (let i = 0; i < size; i++) {
    squareArr.push([])
    for (let j = 0; j < size; j++) {
      const el = triangleArr[j]?.pop()
      if (!el) throw new Error('el not found')
      squareArr[i].push(el)
    }
    if (!triangleArr.at(0)?.length) triangleArr.shift()
  }

  const map: Record<number, [number, number][]> = {}
  for (let i = 0; i < size; i++) {
    const firstRow = squareArr.shift() ?? []
    const firstElements = squareArr.reduce(
      (prev, _cur, i) => [...prev, squareArr[i].shift()!],
      [],
    )
    map[i] = [...firstRow, ...firstElements]
  }
  return map
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

function bifilter<T>(
  xs: T[],
  f: (value: T, index: number, array: T[]) => boolean,
): [T[], T[]] {
  return xs.reduce<[T[], T[]]>(([T, F], x, i, arr) => {
    if (f(x, i, arr) === false) {
      return [T, [...F, x]]
    } else {
      return [[...T, x], F]
    }
  }, [[], []])
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

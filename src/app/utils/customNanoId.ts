import { customAlphabet } from 'nanoid'

const customNanoId = (unit: number) => {
  const nanoid = customAlphabet('1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', unit)
  return nanoid()
}

export default customNanoId

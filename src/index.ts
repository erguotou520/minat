import { parseArgs } from './args'
import { upload } from './upload'

export async function run(_args: string[]) {
  const { service, args } = parseArgs(_args)
  if (service === 'upload') {
    upload(args)
  }
}

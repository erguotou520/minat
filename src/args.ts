import minimist, { type ParsedArgs } from 'minimist'

const usageString = `usage:
minat upload [-v 1.0.0] [-d description] [-p /path/to/project]
minat help
`

type Service = 'upload' | 'help'
const services = ['help', 'upload']

export interface Args extends ParsedArgs {
  v?: string
  d?: string
  p?: string
}

export function parseArgs(_args: string[]): { service: Service; args: Args } {
  // 空命令
  if (!_args.length) {
    console.error(usageString)
    process.exit(-1)
  }
  // 服务
  const service = _args[0]
  if (!services.includes(service)) {
    console.warn('不支持的服务')
    console.error(usageString)
    process.exit(-1)
  }
  // 参数
  const args: ParsedArgs = minimist(_args.slice(1))
  return { service: service as Service, args: args as Args }
}

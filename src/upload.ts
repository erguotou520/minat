import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path, { resolve } from 'node:path'
import { promisify } from 'node:util'
import type { Args } from './args'

interface UploadArgs {
  projectPath: string
  version: string
  description?: string
}

interface PackageInfo {
  version?: string
  description?: string
  versionDesc?: string
}

// 当前运行时目录
const currentDir = process.cwd()

// 上传后保存json位置
// const outputFolder = os.tmpdir()

// 命令行工具
let cliPath: string
let cliCwd: string

// 获取命令行位置
export async function getCliPath() {
  if (!['win32', 'darwin'].includes(process.platform)) {
    throw new Error('不支持系的操作统')
  }
  // 默认路径
  cliPath =
    process.platform === 'darwin'
      ? '/Applications/wechatwebdevtools.app'
      : 'C:\\Program Files (x86)\\Tencent\\微信web开发者工具'
  // 环境变量覆盖
  const envCliPath = process.env.WECHAT_MINAPP_DEVTOOL_PATH
  if (envCliPath) {
    cliPath = envCliPath
  }
  if (process.platform === 'darwin') {
    cliCwd = path.resolve(cliPath, 'Contents/MacOS')
    cliPath = path.resolve(cliCwd, 'cli')
  } else if (process.platform === 'win32') {
    cliCwd = cliPath
    cliPath = path.resolve(cliCwd, 'cli.bat')
  }
  try {
    if (!(await promisify(fs.exists)(cliPath))) {
      throw new Error('微信开发者工具的命令行路径不正确')
    }
  } catch (error) {
    // do nothing
    throw new Error('微信开发者工具的命令行路径不正确')
  }
  return {
    cliPath,
    cliCwd,
  }
}

// 判断当前目录是否有app.json和app.js文件
export async function canFolderUpload(folder: string) {
  const jsonPath = resolve(folder, 'app.json')
  const jsPath = resolve(folder, 'app.js')
  if (
    (await promisify(fs.exists)(jsonPath)) &&
    (await promisify(fs.exists)(jsPath))
  ) {
    return true
  }
  return false
}

// 获取默认的上传的项目路径
// async function getDefaultProjectPath(): Promise<string | undefined> {
// 	const distFolder = resolve(currentDir, 'dist')
// 	if (await promisify(fs.exists)(distFolder)) {
// 		if (await canFolderUpload(distFolder)) {
// 			return distFolder
// 		}
// 	}
// 	if (await canFolderUpload(currentDir)) {
// 		return currentDir
// 	}
// }

// 执行上传任务
async function doUpload(args: UploadArgs) {
  if (!cliPath) {
    await getCliPath()
  }
  if (!args.version) throw new Error('版本号必须')
  const spawnArgs: string[] = [
    'upload',
    '-v',
    args.version,
    '--project',
    args.projectPath,
  ]
  if (args.description) {
    spawnArgs.push(...['-d', args.description])
  }
  // const outputPath = resolve(outputFolder, `mina_cli_output_${Math.random().toString(36).substr(2, 8)}.json`)
  // spawnArgs.push(...['-i', outputPath])
  console.debug(`${cliPath} ${spawnArgs.join(' ')}`)
  console.log(`正在上传${args.version}版本`)
  return new Promise<void>((resolve, reject) => {
    const child = spawn(cliPath, spawnArgs, {
      cwd: cliCwd,
      stdio: 'inherit',
    })

    child.on('close', (code) => {
      if (code) {
        reject(code)
      } else resolve()
    })
  })
}

// 获取指定路径下的package.json文件内容
async function getPkgInfo(folder: string): Promise<PackageInfo> {
  const packageJsonFile = path.resolve(folder, 'package.json')
  try {
    if (await promisify(fs.exists)(packageJsonFile)) {
      const pkg = require(packageJsonFile)
      return pkg as PackageInfo
    }
  } catch (error) { }
  return {}
}

// 默认参数获取和运行需要环境的判断
async function beforeRun(args: Args) {
  // 获取版本号，版本描述，和上传后的结果输出目录
  let version = args.v
  let desc = args.d
  let projectPath = args.p
  // 如果没有配置项目路径，则根据当前目录去上传，如果当前目录下有dist目录，则优先上传dist目录
  projectPath = projectPath || currentDir
  if (!projectPath) {
    throw new Error('项目路径未提供')
  }
  if (!path.isAbsolute(projectPath)) {
    projectPath = path.resolve(projectPath)
  }
  // 读取不到则去读取package.json文件
  if (!version || !desc) {
    const pkg = await getPkgInfo(currentDir)
    if (pkg) {
      // 版本号
      if (!version && pkg.version) {
        version = pkg.version
      }
      // 版本描述
      if (!desc && (pkg.versionDesc || pkg.description)) {
        desc =
          pkg.versionDesc ||
          pkg.description ||
          `${new Date().toLocaleTimeString()}@${version}`
      }
    }
  }
  if (!version) {
    throw new Error('项目版本未提供')
  }
  return { version, desc, projectPath }
}

// 根据配置和环境变量取执行上传
export async function upload(args: Args) {
  const { version, desc, projectPath } = await beforeRun(args)
  try {
    await doUpload({
      projectPath,
      version,
      description: desc,
    })
  } catch (error) {
    console.error(error)
    process.exit(-1)
  }
}

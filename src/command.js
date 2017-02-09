// @flow

import FS from 'sb-fs'
import Path from 'path'
import promisify from 'sb-promisify'
import ConfigFile from 'sb-config-file'
import ChildProcess from 'child_process'
import PackageInfo from 'package-info'
import gitStatus from './helpers/git-status'
import * as Utils from './context-utils'

import * as Helpers from './helpers'
import type { Options, Project, Repository, Package } from './types'

const getPackageInfo = promisify(PackageInfo)

export default class Command {
  name: string;
  description: string;

  state: ConfigFile;
  config: ConfigFile;
  options: Options;
  utils: Utils;
  // eslint-disable-next-line
  run(...params: Array<any>) {
    throw new Error('Command::run() is unimplemented')
  }
  initialize(options: Options) {
    this.state = new ConfigFile(Path.join(options.stateDirectory, 'state.json'))
    this.config = new ConfigFile(Path.join(options.stateDirectory, 'config.json'))
    this.options = options
    this.utils = Utils
  }
  getProjectsRoot(): string {
    return Helpers.processPath(this.config.get('projectsRoot'))
  }
  async getCurrentProjectPath(): Promise<?string> {
    const currentDirectory = process.cwd()
    const projectsRoot = this.getProjectsRoot()
    const rootIndex = currentDirectory.indexOf(projectsRoot)
    if (rootIndex !== 0) {
      return null
    }
    const chunks = currentDirectory.slice(projectsRoot.length + 1).split(Path.sep).slice(0, 2)
    if (chunks.length !== 2) {
      return null
    }
    return Path.join(projectsRoot, chunks[0], chunks[1])
  }
  async getOrganizations(): Promise<Array<string>> {
    const organizations = []
    const projectsRoot = this.getProjectsRoot()
    const entries = await FS.readdir(projectsRoot)
    await Promise.all(entries.map(async function(entry) {
      const path = Path.join(projectsRoot, entry)
      const stat = await FS.lstat(path)
      if (stat.isDirectory()) {
        organizations.push(path)
      }
      return true
    }))
    return organizations
  }
  async getProjects(): Promise<Array<string>> {
    const projects = []
    const organizations = await this.getOrganizations()
    await Promise.all(organizations.map(async function(orgPath) {
      const items = await FS.readdir(orgPath)
      for (const item of items) {
        const itemPath = Path.join(orgPath, item)
        const stat = await FS.lstat(itemPath)
        if (stat.isDirectory()) {
          projects.push(itemPath)
        }
      }
      return null
    }))
    return projects
  }
  async getProjectDetails(path: string): Promise<Project> {
    const name = path.split(Path.sep).slice(-2).join('/')
    const config = new ConfigFile(Path.join(path, Helpers.CONFIG_FILE_NAME), {
      dependencies: [],
      configurations: [],
    })
    return Object.assign(config.get(), {
      path,
      name,
      repository: await this.getRepositoryDetails(path),
      package: await this.getPackageDetails(path),
    })
  }
  async getRepositoryDetails(path: string): Promise<Repository> {
    const status = await gitStatus(path)
    return {
      path,
      ...status,
    }
  }
  async getPackageDetails(path: string): Promise<Package> {
    try {
      const info = await getPackageInfo(path)
      return {
        version: info.version,
      }
    } catch (e) {
      // no npm package
    }
    return {
      version: '0.0.0',
    }
  }
  async spawn(name: string, parameters: Array<string>, options: Object, onStdout: ?((chunk: string) => any), onStderr: ?((chunk: string) => any)) {
    return new Promise((resolve, reject) => {
      const spawned = ChildProcess.spawn(name, parameters, options)
      if (onStdout) {
        spawned.stdout.on('data', onStdout)
      }
      if (onStderr) {
        spawned.stderr.on('data', onStderr)
      }
      spawned.on('close', resolve)
      spawned.on('error', reject)
    })
  }

  log(text: any) {
    if (text && text.name === 'RepoManError') {
      console.log('Error:', text.message)
    } else {
      console.log(text)
    }
  }
}

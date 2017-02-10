// @flow

import FS from 'sb-fs'
import Path from 'path'
import copy from 'sb-copy'
import Command from '../command'
import { parseSourceURI, RepoManError } from '../helpers'

const STATE = {
  ERR: 0,
  SKIP: 1,
  PASS: 2,
  FAIL: 3,
}

export default class SyncCommand extends Command {
  name = 'sync [org]'
  description = 'Sync configuration for projects, defaults to just current folder'

  async run(_: Object, orgName: string) {
    // until we get flags, lets just prompt
    const answer = await this.utils.prompt('Overwrite files on conflict?', ['no', 'yes'])
    const overwrite = answer === 'yes'

    const getCurrentProject = async () => {
      // current folder
      const currentProjectPath = await this.getCurrentProjectPath()
      if (!currentProjectPath) {
        throw new RepoManError('Current directory is not a Repoman project')
      }
      return currentProjectPath
    }

    const projects = orgName ? await this.getProjects(orgName) : [await getCurrentProject()]
    const statuses = projects.reduce((acc, cur) => ({
      ...acc,
      [cur]: STATE.EMPTY
    }), {})

    const errors = []
    const handleError = (projectPath: string, e) => errors.push(e)
    const handleStatus = (path: string, status: number) => {
      // log updated statuses
      statuses[path] = status
      this.logStatuses(statuses)
    }

    // log once before run
    this.logStatuses(statuses)

    // run syncs
    await Promise.all(projects.map((projectPath) => {
      return this.syncRepo(projectPath, overwrite, handleStatus, handleError)
    }))

    // persist statuses
    this.logStatuses(statuses, true)

    if (errors.length) {
      process.exitCode = 1
      this.log(new RepoManError('Unable to sync project dependencies'))
      this.log('Errors:')
      this.log(errors.map(e => e.message).join('\n'))
    }
  }

  statuses = {
    [STATE.EMPTY]: this.utils.Symbol.dot,
    [STATE.SKIP]: this.utils.Symbol.dot,
    [STATE.PASS]: this.utils.Symbol.check,
    [STATE.FAIL]: this.utils.Symbol.x,
  }

  logStatuses(statuses: Object, persist: boolean) {
    const out = []
    Object.keys(statuses).forEach((path) => {
      const status = statuses[path]
      out.push(` ${this.statuses[status]} ${this.lastFolder(path)}`)
    })
    // clear screen
    process.stdout.write('\u001B[2J\u001B[0;0f')
    process.stdout.write(out.join('\n'))
    if (persist) {
      console.log('\n')
    }
  }

  async syncRepo(projectPath: string, overwrite: boolean, onStatus: Function, onErrorCb: Function) {
    const onError = (err) => {
      onErrorCb(projectPath, err)
      onStatus(projectPath, STATE.FAIL)
    }
    const log = chunk => this.log(chunk.toString().trim())
    const projectsRoot = await this.getProjectsRoot()

    // Dependencies
    const dependencies = []
    const currentProject = await this.getProjectDetails(projectPath)

    if (currentProject.dependencies) {
      for (const entry of currentProject.dependencies) {
        try {
          const parsed = parseSourceURI(entry)
          const entryPath = Path.join(projectsRoot, parsed.username, parsed.repository)
          if (!await FS.exists(entryPath)) {
            dependencies.push(entry)
          }
        } catch (error) {
          onError(error)
        }
      }

      for (const dependency of dependencies) {
        try {
          await this.spawn(process.execPath, [process.argv[1] || require.resolve('../../cli'), 'get', dependency], {}, log, log)
        } catch (error) {
          onError(error)
        }
      }
    }

    // Configurations
    if (!currentProject.configurations) {
      onStatus(projectPath, STATE.SKIP)
    } else {
      const configsRoot = this.getConfigsRoot()
      for (const entry of currentProject.configurations) {
        try {
          const parsed = parseSourceURI(entry)
          const entryPath = Path.join(configsRoot, parsed.username, parsed.repository)
          if (!await FS.exists(entryPath)) {
            await this.spawn(process.execPath, [process.argv[1] || require.resolve('../../cli'), 'get-config', entry], {}, log, log)
          }
          // NOTE: We do not overwrite in install, we overwrite in update
          await copy(entryPath, projectPath, {
            dotFiles: true,
            overwrite,
            failIfExists: false,
          })

          onStatus(projectPath, STATE.PASS)
        } catch (error) {
          onError(error)
        }
      }
    }
  }
}

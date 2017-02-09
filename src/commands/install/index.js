// @flow

import FS from 'sb-fs'
import Path from 'path'
import { callback as getProject } from '../get'
import { parseSourceURI, RepoManError } from '../../helpers'

export const name = 'install'
export const description = 'Install current project dependencies'
export async function callback(options: Object) {
  const currentProjectPath = await this.getCurrentProjectPath()
  if (!currentProjectPath) {
    throw new RepoManError('Current directory is not a Repoman project')
  }
  const dependencies = []
  const projectsRoot = await this.getProjectsRoot()
  const currentProject = await this.getProjectDetails(currentProjectPath)
  for (const entry of currentProject.dependencies) {
    try {
      const parsed = parseSourceURI(entry)
      const entryPath = Path.join(projectsRoot, parsed.username, parsed.repository)
      if (!await FS.exists(entryPath)) {
        dependencies.push(entry)
      }
    } catch (error) {
      this.log(error)
      process.exitCode = 1
    }
  }

  for (const dependency of dependencies) {
    try {
      await getProject.call(this, options, dependency)
    } catch (error) {
      this.log(error)
      process.exitCode = 1
    }
  }

  if (process.exitCode === 1) {
    this.log(new RepoManError('Unable to install project dependencies'))
  } else {
    this.log('Successfully installed project dependencies')
  }
}

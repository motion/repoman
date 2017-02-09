// @flow

import Table from 'cli-table'

export const name = 'status'
export const description = 'Get status of your projects'
export async function callback() {
  const projectPaths = await this.getProjects()
  const projects = await Promise.all(projectPaths.map(entry => this.getProjectDetails(entry)))

  const table = new Table({
    head: ['name', 'path', 'branch', 'changes'],
  })
  table.push(...projects.map(function(project) {
    return [project.name, project.path, project.repository.branch, project.repository.filesDirty + project.repository.filesUntracked]
  }))

  this.log(table.toString())
}
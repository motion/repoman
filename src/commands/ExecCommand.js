// @flow

import Command from '../command'

export default class ExecCommand extends Command {
  name = 'exec <command> [parameters...]'
  description = 'Run command in projects'

  async run(options: Object, command: string, parameters: Array<string>) {
    let projects = await this.getProjects()

    if (options.scope) {
      projects = this.matchProjects(projects, options.scope.split(',').filter(i => i))
    }
    if (options.ignore) {
      const ignored = this.matchProjects(projects, options.ignore.split(',').filter(i => i))
      projects = projects.filter(i => ignored.indexOf(i) === -1)
    }

    for (const project of projects) {
      await this.spawn(command, parameters, {
        cwd: project.path,
        stdio: ['inherit', 'inherit', 'inherit'],
      })
    }
  }
}

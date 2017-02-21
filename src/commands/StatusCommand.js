// @flow

import Command from '../command'
import type { Project, NodePackageState, RepositoryState } from '../types'

export default class StatusCommand extends Command {
  name = 'status'
  description = 'Get status of your projects'

  showNpm: boolean;
  async run(options: Object) {
    this.showNpm = !!Object.keys(options).filter(x => x === 'npm').length

    const projectPaths = await this.getProjects()
    const projects = await Promise.all(projectPaths.map(entry => this.getProject(entry)))
    const repositories = await Promise.all(projects.map(entry => this.getRepositoryState(entry)))
    const nodePackageStates = await Promise.all(projects.map(entry => this.getNodePackageState(entry, true)))

    const titles = ['project', 'changes', 'branch', 'npm', 'path']
      .map(c => this.helpers.Color.xterm(247)(c))
    const head = [
      `  ${titles[0]}`,
      this.crow(titles[1]),
      this.crow(titles[2]),
      this.showNpm && this.crow(titles[3]),
      titles[4],
    ]
      .filter(x => !!x)

    const { min, round } = Math
    const columns = process.stdout.columns
    const getWidth = () => min(30, round((columns / head.length) * 0.9))
    const colWidths = head.map(getWidth)
    const table = new this.helpers.Table({ head, colWidths })

    for (let i = 0, length = projects.length; i < length; i++) {
      table.push(this.getRow(projects[i], repositories[i], nodePackageStates[i]))
    }
    this.log(table.show())
  }

  row = (content, props) => ({ content, ...props })
  crow = content => this.row(content, { hAlign: 'center' })

  getRow(project: Project, repository: RepositoryState, nodePackage: NodePackageState) {
    const { Color, Figure, Symbol, tildify } = this.helpers
    const gray = Color.xterm(8)
    const isGit = typeof repository.clean !== 'undefined'
    const none = gray(' - ')
    const path = gray(tildify(project.path))

    let response
    const version = this.showNpm
      ? this.crow(nodePackage.version || none)
      : false

    if (isGit) {
      const isDirty = repository.clean ? Symbol.check : Symbol.x
      const numChanged = repository.filesDirty + repository.filesUntracked
      response = [
        `${isDirty} ${project.name}`,
        this.crow(numChanged || none),
        `${Color.yellow(repository.branchLocal)} ${gray(Figure.arrowRight)} ${repository.branchRemote}`,
        version,
        tildify(path),
      ]
    } else {
      response = [
        `  ${project.name}`,
        this.crow(none),
        this.crow(none),
        version,
        tildify(path),
      ]
    }
    return response.filter(x => !!x)
  }
}

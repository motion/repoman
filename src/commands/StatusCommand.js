// @flow
import Command from '../command'
import type { Project } from '../types'

export default class StatusCommand extends Command {
  name = 'status'
  description = 'Get status of your projects'

  showNpm: boolean;
  async run(options: Object) {
    this.showNpm = !!Object.keys(options).filter(x => x === 'npm').length

    const projectPaths = await this.getProjects()
    const projects = await Promise.all(
      projectPaths.map(entry => this.getProjectDetails(entry, this.showNpm))
    )

    const titles = ['project', 'changes', 'branch', 'npm', 'path']
      .map(c => this.utils.Color.xterm(247)(c))
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
    const table = new this.utils.Table({ head, colWidths })

    // response
    const final = await Promise.all(projects.map(this.getRow))
    final.forEach(r => table.push(r))
    this.log(table.print())
  }

  row = (content, props) => ({ content, ...props })
  crow = content => this.row(content, { hAlign: 'center' })

  getRow = async (project: Project) => {
    const { Color, Figure, Symbol, tildify } = this.utils
    const gray = Color.xterm(8)
    const repo = project.repository
    const isGit = typeof repo.clean !== 'undefined'
    const none = gray(' - ')
    const path = gray(tildify(project.path))

    let response
    const version = this.showNpm
      ? this.crow(project.npm ? project.npm.version : none)
      : false

    if (isGit) {
      const isDirty = repo.clean ? Symbol.check : Symbol.x
      const numChanged = repo.filesDirty + repo.filesUntracked
      response = [
        `${isDirty} ${project.name}`,
        this.crow(numChanged || none),
        `${Color.yellow(repo.branchLocal)} ${gray(Figure.arrowRight)} ${repo.branchRemote}`,
        version,
        path,
      ]
    } else {
      response = [
        `  ${project.name}`,
        this.crow(none),
        this.crow(none),
        version,
        path,
      ]
    }
    return response.filter(x => !!x)
  }
}

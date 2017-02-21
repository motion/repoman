// @flow

import FS from 'sb-fs'
import Command from '../command'
import { parseSourceURI } from '../helpers'

export default class GetConfigCommand extends Command {
  name = 'get.config <remote_path>'
  description = 'Clone the given path into configs root'

  async run(_: Object, path: string) {
    this.silent = _.silent
    // clones the repo into projects dir
    const configsRoot = this.getConfigsRoot()
    const parsed = parseSourceURI(configsRoot, path)

    await FS.mkdirp(configsRoot)
    if (await FS.exists(parsed.path)) {
      // TODO: Git pull instead of removing maybe?
      this.log(`Replacing old config at ${this.helpers.tildify(parsed.path)}`)
      await FS.rimraf(parsed.path)
    }

    const params = ['clone', `git@github.com:${parsed.org}/${parsed.name}`, parsed.path]
    const logOutput = (givenChunk) => {
      const chunk = givenChunk.toString('utf8').trim()
      if (chunk.length) {
        this.log(chunk)
      }
    }
    const cloneExitCode = await this.spawn('git', params, { cwd: parsed.path }, logOutput, logOutput)
    if (cloneExitCode !== 0) {
      process.exitCode = 1
      return
    }
    if (parsed.tag) {
      const tagExitCode = await this.spawn('git', ['checkout', parsed.tag], { cwd: parsed.path }, null, null)
      if (tagExitCode !== 0) {
        process.exitCode = 1
        return
      }
    }
    this.log(`Successfully downloaded '${parsed.org}/${parsed.name}'`)
  }
}

// @flow

import FS from 'sb-fs'
import invariant from 'assert'

import Command from './command'
import Commands from './commands'
import * as Helpers from './helpers'
import type { Options } from './types'

const PRIVATE = {}

class RepoMan {
  options: Options;
  commands: Map<string, Command>;
  constructor(something: Object, options: Options) {
    if (something !== PRIVATE) {
      throw new Error('Invalid invocation of new RepoMan() use RepoMan.create() instead')
    }
    this.options = options
    this.commands = new Map()
  }
  getCommands(): Array<Command> {
    return Array.from(this.commands.values())
  }
  getCommand(name: string): ?Command {
    for (const [commandName, command] of this.commands) {
      if (commandName.split(' ')[0] === name) {
        return command
      }
    }
    return null
  }
  async addCommand(Entry: Class<Command>, options: Options) {
    // initialize command class
    const command = await Entry.get(options, this)
    invariant(typeof command.name === 'string', 'name must be a string')
    invariant(typeof command.description === 'string', 'description must be a string')
    invariant(typeof command.run === 'function', 'run must be a function')
    this.removeCommand(command.name)
    this.commands.set(command.name, command)
  }
  removeCommand(name: string) {
    this.commands.delete(name)
  }
  // NOTE: All class methods should be ABOVE this method
  static async get(givenOptions: Object = {}): Promise<RepoMan> {
    const options = Helpers.fillConfig(givenOptions)
    await FS.mkdirp(options.stateDirectory)

    const repoMan = new RepoMan(PRIVATE, options)
    const command = await Command.get(options, repoMan)
    await FS.mkdirp(command.getProjectsRoot())
    await FS.mkdirp(command.getConfigsRoot())
    await Promise.all(Commands.map(entry => repoMan.addCommand(entry, options)))

    return repoMan
  }
}

module.exports = RepoMan

// @flow

import FS from 'sb-fs'
import Path from 'path'
import copy from 'sb-copy'
import invariant from 'assert'

import Commands from './commands'
import * as Helpers from './helpers'
import type Command from './command'
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

    Commands.forEach((command) => { this.addCommand(command, options) })
  }
  getCommands(): Array<Command> {
    return Array.from(this.commands.values())
  }
  addCommand(Entry: Class<Command>, options: Options) {
    // initialize command class
    const command = new Entry(options, this)
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
    await copy(Path.normalize(Path.join(__dirname, '..', 'template', 'root')), options.stateDirectory, {
      overwrite: false,
      failIfExists: false,
    })

    return new RepoMan(PRIVATE, options)
  }
}

module.exports = RepoMan

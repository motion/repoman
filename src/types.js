// @flow

export type Options = {
  stateDirectory: string,
}

export type GitState = {
  path: string,
  clean: boolean,
  branchLocal: string,
  branchRemote: string,
  filesDirty: number,
  filesUntracked: number,
}

export type NpmInfo = {
  name: string,
  version: string,
  description: string,
}

export type ProjectState = {
  org: string,
  name: string,
  path: string,
  dependencies: Array<string>,
  configurations: Array<string>,
}

export type Project = {
  org: string,
  name: string,
  path: string,
}

export type Organization = {
  name: string,
  path: string,
}

export type ParsedRepo = {
  username: string,
  repository: string,
  tag: ?string,
  subfolder: ?string,
}

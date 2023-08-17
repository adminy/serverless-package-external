'use strict';
const fs = require('fs/promises')
const path = require('path')
const util = require('util')
const exe = util.promisify(require('child_process').exec)
const exists = path => fs.access(path).then(() => true).catch(() => false)

module.exports = class {
  constructor(serverless, _, { log }) {
    this.serverless = serverless
    this.log = log
    this.options = this.serverless.service?.custom?.packageExternal || {}
    this.hooks = {
      'before:package:initialize': this.beforePackage.bind(this),
      'after:package:finalize': this.afterPackage.bind(this)
    }
    this.handleExit(['SIGINT', 'SIGTERM', 'SIGQUIT'])
  }

  * actions() {
    const slsFns = this.serverless.service?.functions || {}
    const images = this.serverless.service?.provider?.ecr?.images || {}
    const logs = {
      log: msg => this.log.success('[sls-py-extern-pkgs] ' + msg),
      warn: msg => this.log.warning('[sls-py-extern-pkgs] ' + msg)
    }
    for (const [externalFolder, { functions, source, cmd }] of Object.entries(this.options)) {
      for (const name of functions || Object.keys(slsFns)) {
        const slsFn = slsFns[name]
        const imagePath = images?.[slsFn?.image?.name]?.path || slsFn?.image?.path
        const target = path.join(process.cwd(), '.serverless', imagePath || slsFn?.module || '', 'requirements')
        yield { name, externalFolder, source, target, cmd, ...logs }
      }
    }
  }

  async beforePackage() {
    // Link external folders
    for (const { name, externalFolder, source, target, cmd, log, warn } of this.actions()) {
      const noSource = !await exists(source)
      const cwd = path.join(target, externalFolder)
      if (await exists(cwd) || noSource) {
        const issue = noSource ? `${source} does not exist` : `${cwd} already exists`
        warn(`cannot Link function: ${name}, ${issue}`)
      } else {
          try {
            if (typeof fs.cp === 'function') {
              await fs.cp(path.join(process.cwd(), source), cwd,  { recursive: true })
            } else {
              await exe(`mkdir -p "${cwd}"`)
              await exe(`cp -r "${path.join(process.cwd(), source)}" "${cwd}"`)

            }
            cmd && await exe(cmd, { cwd, env: process.env })
          } catch (err) { warn(err) }
          log(`Linked "${externalFolder}" for function: ${name}`)
      }
    }
  }

  async afterPackage() {
    // Cleanup packaged external folders
    for (const { name, externalFolder, target, log } of this.actions()) {
      const externalPath = path.join(target, externalFolder)
      if (await exists(externalPath) && await fs.rm(externalPath, { recursive: true, force: true })) {
        log(`Cleanup "${externalFolder}" for function: ${name}`)
      }
    }
  }

  handleExit(signals) {
    for (const signal of signals) {
      process.on(signal, () => this.afterPackage())
    }
  }
}

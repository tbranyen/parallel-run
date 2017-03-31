const { join } = require('path');
const { readFileSync } = require('fs');
const waitForPort = require('wait-for-port');
const findPackages = require('find-package-json');
const spawn = require('spawn-command');
const ps = require('./util/ps');

function parseScript(script) {
  const parts = script.split(' ');
  const commandName = parts[0];
  const hasKey = commandName.includes('=');

  if (!hasKey) {
    return { env: {}, command: script };
  }

  const env = {};
  let index = -1;

  parts.some((command, i) => {
    if (index === -1 && command.includes('=')) {
      const [key, value] = command.split('=');
      env[key] = value;
    }
    else {
      index = i;
      return true;
    }
  });

  return { env, command: parts.slice(index - 1).join(' ') };
}

module.exports = class NpmScriptSink {
  constructor(scriptName) {
    this.scriptName = scriptName;
    this.output = '';
    this.getOutputSet = new Set();

    this.spawn();
  }

  spawn() {
    this.exited = false;
    this.isReady = false;

    const { scriptName } = this;
    const packages = findPackages();
    const packageLookup = packages.next().value;

    this.package = packageLookup;

    try {
      const rcPath = join(packageLookup.__path, '../.parallel-run');
      this.rc = JSON.parse(readFileSync(rcPath, { encoding: 'utf8' }));
    }
    catch (unhandledException) {
      this.rc = {};
    }

    if (!this.package) {
      throw new Error('Missing required `package.json`');
    }

    this.script = parseScript(this.package.scripts[scriptName]);
    this.command = this.script.command;

    if (!this.command) {
      throw new Error(`Missing required script ${scriptName}`);
    }

    const options = this.rc[scriptName] || {};

    const runAndListen = () => {
      this.isReady = true;
      this.process = spawn(this.command, {
        cwd: process.cwd(),
        env: Object.assign({}, process.env, this.script.env),
      });

      const { stdout, stderr } = this.process;

      this.process.on('error', err => this.invokeGetOutputSet(err.toString()));
      this.process.on('exit', err => {
        this.exited = true;
        this.onExit();
      });

      stdout.on('data', chunk => this.invokeGetOutputSet(chunk));
      stderr.on('data', chunk => this.invokeGetOutputSet(chunk));
    };

    const { waitFor } = options;
    const opts = {
      numRetries: 200,
      retryInterval: 1000,
    };

    if (waitFor) {
      this.invokeGetOutputSet(`Waiting for port ${waitFor.port} to become ready`);

      waitForPort(waitFor.host || 'localhost', waitFor.port, opts, err => {
        if (err) {
          this.invokeGetOutputSet(err.toString());
          throw err;
        }

        runAndListen();
      });
    }
    else {
      runAndListen();
    }
  }

  getOutput(fn) {
    this.getOutputSet.add(fn);
  }

  invokeGetOutputSet(chunk) {
    this.buffer = Buffer.concat([
      this.buffer || new Buffer(''),
      new Buffer(chunk),
    ]);

    chunk = chunk.toString();
    chunk = chunk.replace(/\[\?25l/g, '').replace(/\[2K/g, '');
    chunk = chunk.replace(/\[1G/g, '');

    this.output += chunk;
    this.getOutputSet.forEach(fn => fn());
  }

  terminate(opts = { log: console.log }) {
    if (!this.process) {
      return Promise.resolve();
    }

    opts.log(`Terminating script ${this.scriptName}:`);

    return new Promise((resolve, reject) => {
      ps(this.process.pid, (err, children) => {
        if (err) { return reject(err); }

        children.forEach(({ PID, COMMAND }) => {
          if (!opts.silent) {
            opts.log(`  - Killing sub-process \`${COMMAND}\` with PID ${PID}`);
          }

          spawn(`kill -9 ${PID}`);
        });

        resolve();
      });
    });
  }

  clear() {
    this.output = '';
    this.invokeGetOutputSet('');
  }

  restart() {
    if (this.isReady) {
      this.clear();
      this.output = `Reloading ${this.scriptName}...\n`;
      this.terminate({ log: chunk => (this.invokeGetOutputSet(chunk + '\n')) })
        .then(() => this.spawn())
        .catch(ex => this.invokeGetOutputSet(`Error reloading...\n${ex}`));
    }
    else {
      this.invokeGetOutputSet('\nProcess is not ready');
    }
  }
};

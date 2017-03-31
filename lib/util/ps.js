'use strict';

var spawn = require('child_process').spawnSync;

module.exports = function childrenOfPid(pid, callback) {
  var headers = null;

  if (typeof callback !== 'function') {
    throw new Error('childrenOfPid(pid, callback) expects callback');
  }

  if (typeof pid === 'number') {
    pid = pid.toString();
  }

  //
  // The `ps-tree` module behaves differently on *nix vs. Windows
  // by spawning different programs and parsing their output.
  //
  // Linux:
  // 1. " <defunct> " need to be striped
  // ```bash
  // $ ps -A -o comm,ppid,pid,stat
  // COMMAND          PPID   PID STAT
  // bbsd             2899 16958 Ss
  // watch <defunct>  1914 16964 Z
  // ps              20688 16965 R+
  // ```
  //
  // Win32:
  // 1. wmic PROCESS WHERE ParentProcessId=4604 GET Name,ParentProcessId,ProcessId,Status)
  // 2. The order of head columns is fixed
  // ```shell
  // > wmic PROCESS GET Name,ProcessId,ParentProcessId,Status
  // Name                          ParentProcessId  ProcessId   Status
  // System Idle Process           0                0
  // System                        0                4
  // smss.exe                      4                228
  // ```

  var childProcess;
  if (process.platform === 'win32') {
    // See also: https://github.com/nodejs/node-v0.x-archive/issues/2318
    childProcess = spawn('wmic.exe', ['PROCESS', 'GET', 'Name,ProcessId,ParentProcessId,Status']);
  } else {
    childProcess = spawn('ps', ['-A', '-o', 'ppid,pid,stat,comm']);
  }

  const ps = String(childProcess.stdout).split('\n').map(line => {
    var columns = line.trim().split(/\s+/);
    if (!headers) {
      headers = columns;

      //
      // Rename Win32 header name, to as same as the linux, for compatible.
      //
      headers = headers.map(normalizeHeader);
      return null;
    }

    var row = {};
    // For each header
    var h = headers.slice();
    while (h.length) {
      row[h.shift()] = h.length ? columns.shift() : columns.join(' ');
    }

    return row;
  }).filter(Boolean);

  var parents = [pid],
      children = [];

  ps.forEach(proc => {
    if (parents.indexOf(proc.PPID) !== -1) {
      parents.push(proc.PID)
      children.push(proc)
    }
  });

  // default name.
  const COMMAND = String(spawn('ps', ['-o', 'comm', '-p', pid]).stdout)
    .split('\n')[1];

  children.push({ PID: pid, COMMAND });

  callback(null, children);
}

/**
 * Normalizes the given header `str` from the Windows
 * title to the *nix title.
 *
 * @param {string} str Header string to normalize
 */
function normalizeHeader(str) {
  if (process.platform !== 'win32') {
    return str;
  }

  switch (str) {
    case 'Name':
      return 'COMMAND';
      break;
    case 'ParentProcessId':
      return 'PPID';
      break;
    case 'ProcessId':
      return 'PID';
      break;
    case 'Status':
      return 'STAT';
      break;
    default:
      throw new Error('Unknown process listing header: ' + str);
  }
}

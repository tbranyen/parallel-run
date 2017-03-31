#!/usr/bin/env node

const { join } = require('path');
const blessed = require('blessed');
const express = require('express');
const getPort = require('get-port');
const { React, render } = require('react-blessed-you');
const argv = require('minimist')(process.argv.slice(2));
const ParallelView = require('./lib/parallel-view');
const NpmScriptSink = require('./lib/sink');
const index = require('./ui/index');

const { createElement } = React;

function parallelRun(labels, ...sinks) {
  const screen = blessed.screen({
    autoPadding: true,
    smartCSR: true,
  });

  screen.enableMouse();

  const boxes = [];

  sinks.forEach((sink, i) => {
    const label = labels[i];
    boxes.push({ label, sink, fg: 'gray' });
  });

  const app = express();

  app.use('/node_modules', express.static(join(__dirname, 'node_modules')));
  app.use('/static', express.static(join(__dirname, 'ui/static')));

  app.get('/', (req, res) => {
    res.send(index({ boxes }));
  });

  getPort({ port: 4444 }).then(port => {
    app.listen(port);

    const address = `http://localhost:${port}`;

    render(createElement('element', {}, [
      createElement(ParallelView, { screen, boxes }),
      createElement('box', { top: '0%', height: '3%' }, `Web UI: ${address}`),
    ]), screen);

    console.log(`Listening on ${address}`);
  });

  screen.key(['escape', 'q', 'C-c'], (ch, key) => process.exit(0));
  screen.key(['C-r'], (ch, key) => {
    boxes.forEach((box, i) => {
      if (box.selected) {
        box.sink.restart();
      }
    });
  });

  screen.key(['up', 'k'], (ch, key) => {
    const pos = boxes.map(function (box) { return box.selected; }).indexOf(true);
    if (pos <= 0) {
      boxes[boxes.length - 1].setSelected(true);
    } else {
      boxes[pos - 1].setSelected(true);
    }
  });

  screen.key(['down', 'j'], (ch, key) => {
    const pos = boxes.map(function (box) { return box.selected; }).indexOf(true);
    if (pos === boxes.length - 1) {
      boxes[0].setSelected(true);
    } else {
      boxes[pos + 1].setSelected(true);
    }
  });

  screen.key(['C-k'], (ch, key) => {
    boxes.forEach((box, i) => {
      if (box.selected) {
        box.sink.clear();
      }
    });
  });
}

const scriptNames = argv._;
const labels = [];
const sinks = [];

scriptNames.forEach(scriptName => {
  labels.push(`npm run ${scriptName}`);
  sinks.push(new NpmScriptSink(scriptName));
});

parallelRun(labels, ...sinks);

const exit = () => sinks.forEach(sink => sink.terminate());

process.on('SIGINT', exit);
process.on('SIGTERM', exit);
process.on('exit', exit);

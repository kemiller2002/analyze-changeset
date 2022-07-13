const { exec } = require("child_process");

function ProcessGitLog(dataParser) {
  this.handleData = function (data) {
    const parts = data.split("\n");

    dataParser(parts);
  };
}

function ProcessGitDiff() {
  this.handleData = function (data) {
    console.log(`d : ${data}`);
  };
}

function getLog(dataParser) {
  exec(
    'git log --pretty=format:"%h"',
    result.bind(new ProcessGitLog(dataParser))
  );
}

function result(error, stdout, stderr) {
  if (error) {
    console.log(`error: ${error.message}`);
    return;
  }

  if (stderr) {
    console.log(`stderr: ${stderr}`);
    return;
  }
  this.handleData(stdout);
}

function getDiffLogs(getDiff, data) {
  const results = [];
  for (let ii = 1; ii < data.length; ii++) {
    const current = data[ii];
    previous = data[ii - 1];
    const diff = {
      current,
      previous,
    };

    getDiff(current, previous, diff);

    results.push(diff);
  }
  return results;
}

function doDiff(exec, handleResult, previous, current) {
  exec(`git diff ${previous} ${current}`, handleResult);
}

function run() {
  const processGitDiff = new ProcessGitDiff();
  const getGitDiff = (c, p, diff) => {
    const handleResult = result.bind(processGitDiff);
    doDiff(exec, handleResult, c, p);
  };
  const dataParser = (d) => getDiffLogs(getGitDiff, d);

  getLog(dataParser);
}

run();

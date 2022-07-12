const { exec } = require("child_process");

function processGitLog() {
  this.handleData = function (data) {
    data.split("\n");

    console.log(data);
  };
}

function getLog() {
  exec('git log --pretty=format:"%h"', result.bind(new processGitLog()));
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

function run() {
  getLog();
}

run();

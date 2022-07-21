const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

function writeFile(fs, diff) {
  const dir = path.join(__dirname, "logs");
  const filename = path.join(
    dir,
    `${diff.current.hash}-${diff.previous.hash}-diff.json`
  );

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  console.log(filename);
  fs.writeFileSync(filename, JSON.stringify(diff));
}

function ProcessGitLog(dataParser) {
  this.handleData = function (data) {
    const parts = data.split("\n");

    dataParser(parts);
  };
}

function ProcessGitDiff(diff, write) {
  this.diff = diff;
  this.handleData = function (data) {
    this.diff.diff = data;
    write(this.diff);
  };
}

function getLog(dataParser) {
  exec(
    'git log --pretty=format:"%h, %cd" --date=format:"%Y-%m-%d %H:%M:%S"',
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
  const dataObjets = data
    .map((x) => x.split(","))
    .map((x) => ({ hash: x[0].trim(), date: x[1].trim() }));

  for (let ii = 1; ii < data.length; ii++) {
    const current = dataObjets[ii];
    const previous = dataObjets[ii - 1];
    const diff = {
      current,
      previous,
    };

    getDiff(current.hash, previous.hash, diff);

    results.push({ ...dataObjets, diff });
  }
  return results;
}

function doDiff(exec, handleResult, previous, current) {
  exec(`git diff ${previous} ${current}`, handleResult);
}

function run() {
  const write = (diff) => writeFile(fs, diff);

  const getGitDiff = (c, p, diff) => {
    const processGitDiff = new ProcessGitDiff(diff, write);

    const handleResult = result.bind(processGitDiff);
    doDiff(exec, handleResult, c, p);
  };

  const dataParser = (d) => getDiffLogs(getGitDiff, d);

  getLog(dataParser);
}

run();

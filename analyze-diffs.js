const fs = require("fs");
const path = require("path");

function loadFile(fs, path) {
  return fs.readFileSync(path, { encoding: "utf8", flag: "r" });
}

function readDirectoryContents(fs, path) {
  return fs.readdirSync(path);
}

function processDiff(actions, content) {
  const parts = content.split("\n");
  const parseProgression = [{}];
  while (parts.length > 0) {
    const currentLine = parts.pop();
    const action = actions.find((x) => x.test(currentLine));
    const result = action(currentLine, parseProgression.slice(-1)[0]);

    try {
      if (result.subLine) {
        parts.push(result.subLine);
        parseProgression.push(result.data);
      } else {
        parseProgression.push(result);
      }
    } catch (e) {
      console.log("ERROR", e.message, currentLine);
      throw e;
    }
  }

  return parseProgression.slice(-1);
}

function handleDiff(line, data) {
  return data;
}

function handleIndex(line, data) {
  return Object.assign({ index: line }, data);
}

function handleRemoveLine(line, data) {
  return Object.assign(
    { previousRevisionDocument: line.replace("---", "").trim() },
    data
  );
}

function handleAddLine(line, data) {
  return Object.assign(
    {
      previousRevisionDocument: line.replace("+++", "").trim(),
    },
    data
  );
}

function handleAddRemoveMetaData(line, data) {
  const lineParts = line.split("@@");

  const split = (entry) => {
    parts = entry.trim().split(",");
    return {
      start: parts[0],
      end: parts[1],
    };
  };

  const hunk = {
    remove: split(lineParts[1]),
    add: split(lineParts[2]),
  };

  const newDataObject = { hunk: hunk, ...data };

  if (lineParts.length > 2) {
    return {
      subLine: line.split("@@")[2],
      data: newDataObject,
    };
  }

  return newDataObject;
}

function handleMinus(line, data) {
  return { ...data };
}

function handleNewFile(line, data) {
  return { ...{ newFile: true }, ...data };
}

function handlePlusOrSpace(line, data) {
  const lineAndType = {
    line,
    type: "undef",
  };

  return {
    ...data,
    lines: [lineAndType, ...(data.lines || [])],
  };
}

function setupActions() {
  const actions = [];

  handleDiff.test = (line) => line.indexOf("diff") == 0;
  actions.push(handleDiff);

  handleIndex.test = (line) => line.indexOf("index") == 0;
  actions.push(handleIndex);

  handleRemoveLine.test = (line) => line.indexOf("---") == 0;
  actions.push(handleRemoveLine);

  handleAddLine.test = (line) => line.indexOf("+++") == 0;
  actions.push(handleAddLine);

  handleAddRemoveMetaData.test = (line) => line.indexOf("@@") == 0;
  actions.push(handleAddRemoveMetaData);

  handleMinus.test = (line) => line.indexOf("-") == 0;
  actions.push(handleMinus);

  handlePlusOrSpace.test = (line) =>
    line.indexOf("+") == 0 || line.indexOf(" ") == 0 || line == "";
  actions.push(handlePlusOrSpace);

  handleNewFile.test = (line) => line.indexOf("new file") == 0;
  actions.push(handleNewFile);

  return actions;
}

function run() {
  const actions = setupActions();
  const dir = path.join(__dirname, `logs`);
  const files = readDirectoryContents(fs, dir);

  files
    .map((x) => {
      return loadFile(fs, path.join(dir, x));
    })
    .map((x) => processDiff(actions, x))
    .forEach((element) => {
      console.log(element);
    });
}

run();

const fs = require("fs");
const path = require("path");
const { hasUncaughtExceptionCaptureCallback } = require("process");

function loadFile(fs, path) {
  console.log(path);
  return fs.readFileSync(path, { encoding: "utf8", flag: "r" });
}

function readDirectoryContents(fs, path) {
  return fs.readdirSync(path).filter((x) => x.indexOf("-diff") !== -1);
}

function getDateFromFileName(fileName) {
  return fileName.replace(".diff", "").split("*")[1];
}

function processDiff(actions, content) {
  const parts = content.contents.split("\n");
  const parseProgression = [
    {
      fileName: content.fileName,
      commitDate: content.commitDate,
    },
  ];
  while (parts.length > 0) {
    const currentLine = parts.pop();
    const action = actions.find((x) => x.test(currentLine));
    const result = action(currentLine, parseProgression.slice(-1)[0]);

    if (result.skip) {
      result.raw = content;
      return result;
    }

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

  return parseProgression.slice(-1)[0];
}

function handleDiff(line, data) {
  return data;
}

function handleIndex(line, data) {
  return {
    index: line,
    ...data,
  };
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

function separateOutChange(entry) {
  const parts = (entry || ",").trim().split(",");
  return {
    sign: parts[0][0],
    change: parts[0].replace(/(\+|\-)/, ""),
    lineCount: parts[1],
  };
}

function handleAddRemoveMetaData(line, data) {
  const lineParts = line.split("@@");
  const startEndParts = lineParts[1].trim().split(" ");

  const hunk = {
    remove: separateOutChange(startEndParts[0]),
    add: separateOutChange(startEndParts[1]),
  };

  const newDataObject = { hunk, ...data };

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
  return { newFile: true, ...data };
}

function determineLineType(line) {
  if (line[0] == "+") return "plus";
  if (line[0] == "-") return "minus";
  if (line[0] == " " || !line[0]) return "none";

  throw new Error(`Unsupported type: ${line}`);
}

function handlePlusOrSpace(line, data) {
  const lineAndType = {
    line: line.replace(/^(\s|-|\+)/, ""),
    type: determineLineType(line),
  };

  return {
    ...data,
    lines: [lineAndType, ...(data.lines || [])],
  };
}

function setupActions() {
  const actions = [];

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

  handleDiff.test = (line) => line.indexOf("diff") == 0;
  actions.push(handleDiff);

  return actions;
}

function pushAction(item) {
  const test = item.test;

  const wrapper = (line, data) => {
    const currentData = data.entries.pop() || {};
    const result = test(result);
  };

  this.prototype.push();
}

function separateMultipleEntries(fileName, commitDate, entry) {
  const e = entry
    .replace(/diff --git/g, "/*new entry*/diff --git")
    .split("/*new entry*/")
    .filter((x) => x)
    .map((x) => ({ fileName, commitDate, contents: x }));

  return e;
}

function writeFile(path, contents) {
  fs.writeFileSync(path, contents);
}

function stringToHash(string) {
  var hash = 0;

  if (string.length == 0) return hash;

  for (i = 0; i < string.length; i++) {
    char = string.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  return hash;
}

function run() {
  const actions = setupActions();
  const dir = path.join(__dirname, `logs`);
  const files = readDirectoryContents(fs, dir);

  files
    .map((x) => {
      const fileData = JSON.parse(loadFile(fs, path.join(dir, x)));
      return {
        fileName: x,
        contents: fileData.diff,
        commitDate: fileData.current.date,
      };
    })
    .map((x) => separateMultipleEntries(x.fileName, x.commitDate, x.contents))
    .flat()
    .filter((x) => x)
    .map((x) => processDiff(actions, x))
    .filter((x) => x)
    .forEach((element) => {
      const stringElement = JSON.stringify(element);
      const processedPath = path.join(dir, "processed");
      const filePath = path.join(
        processedPath,
        `${stringToHash(stringElement)}.json`
      );

      if (!fs.existsSync(processedPath)) {
        fs.mkdirSync(processedPath);
      }
      writeFile(filePath, stringElement);
    });
}

run();

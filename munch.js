#!/bin/node
const fs = require("fs");
const path = require("path");
const { Readable } = require("stream");
const arguments = process.argv.slice(2);
const zlib = require("zlib");

const equalsArg = (key, arg) => arg.key === key || arg.altKey === key;
const createArg = (name, key, altKey, description, requiresValue = false) => ({
  key,
  requiresValue,
  altKey,
  description,
  name,
});

const alternates = {
  a: ["4", "@"],
  A: ["4", "@"],
  b: ["8", "6"],
  B: ["8", "6"],
  c: ["["],
  C: ["["],
  d: [],
  D: [],
  e: ["3"],
  E: ["3"],
  f: [],
  F: [],
  g: ["9"],
  G: ["9"],
  h: [],
  H: [],
  i: ["|"],
  I: ["|"],
  j: ["]"],
  J: ["]"],
  k: [],
  K: [],
  l: ["1"],
  L: ["1"],
  m: [],
  M: [],
  n: [],
  N: [],
  o: ["0"],
  O: ["0"],
  p: [],
  P: [],
  q: [],
  Q: [],
  r: [],
  R: [],
  s: ["$", "5"],
  S: ["$", "5"],
  t: ["7", "+"],
  T: ["7", "+"],
  u: [],
  U: [],
  v: [],
  V: ["v"],
  w: [],
  W: [],
  x: [],
  X: [],
  y: [],
  Y: [],
  z: ["2"],
  Z: ["2"],
};

function unescape(token) {
  if (typeof token !== "string") return token;
  return token.replaceAll(/\\(.)/g, "$1");
}

function isComment(input = "") {
  for (const char of ["#", "//"]) {
    if (input.substring(0, char.length) === char) {
      return true;
    }
  }
  return false;
}

function getPermutationDivisors(allArrays) {
  var divisors = [];
  for (var i = allArrays.length - 1; i >= 0; i--) {
    divisors[i] = divisors[i + 1]
      ? divisors[i + 1] * allArrays[i + 1].length
      : 1;
  }
  return divisors;
}

function getPermutation(allArrays, divisors, n = 1) {
  var result = "",
    curArray;

  for (var i = 0; i < allArrays.length; i++) {
    curArray = allArrays[i];
    const value = curArray[Math.floor(n / divisors[i]) % curArray.length];
    result += typeof value === "undefined" ? "" : value;
  }

  return result;
}

function getPermutationCount(arr) {
  return arr.reduce((prev, current) => prev * current.length, 1);
}

function factorial(num) {
  let result = 1;
  for (let i = 1; i <= num; i++) {
    result *= i;
  }
  return result;
}

function getUniquePermutationCount(arr) {
  const used = [];
  for (let i = 0; i < arr.length; i++) {
    for (let j = 0; j < arr.length; j++) {
      const id = arr[i].join("");
      if (!used.includes(id)) {
        used.push(id);
      }
    }
  }
  const canRepeat = arr.length - used.length;
  const cannotRepeat = used.length;
  return canRepeat ** canRepeat + factorial(cannotRepeat);
}

function getAlternates(str) {
  const tokenChars = (Array.isArray(str) ? str : str.split("")).map((c) => {
    if (c.length === 1) {
      return (alternates[c] || []).slice().concat([c]);
    } else {
      return c.split("").map((c1) => (alternates[c1] || []).concat([c1]));
    }
  });

  return tokenChars;
}

const prettyTime = (seconds) => {
  let magnitude = 0;
  let interval = "seconds";
  let result = seconds;
  while (result > 100 && magnitude < 8) {
    switch (magnitude) {
      case 0: // minutes
        result = result / 60;
        interval = "minutes";
        break;
      case 1: // hours
        result = result / 60;
        interval = "hours";
        break;
      case 2: // days
        result = result / 24;
        interval = "days";
        break;
      case 3: // months
        result = result / 30.42;
        interval = "months";
        break;
      case 4: // years
        result = result / 12;
        interval = "years";
        break;
      case 5: // decades
        result = result / 10;
        interval = "decades";
        break;
      case 6: // centuries
        result = result / 10;
        interval = "centuries";
        break;
      case 7: // millenia
        result = result / 10;
        interval = "millenia";
        break;
    }
    magnitude += 1;
  }
  return {
    interval,
    time: result,
  };
};

const prettyNumber = (
  value,
  decimals = 1,
  format = "short",
  separator = ","
) => {
  const str = Math.floor(value).toString();
  const magnitude = str.length / 3;
  let suffix = "";

  if (magnitude > 5) {
    suffix = "E";
  } else if (magnitude > 4) {
    suffix = "T";
  } else if (magnitude > 3) {
    suffix = "B";
  } else if (magnitude > 2) {
    suffix = "M";
  } else if (magnitude > 1) {
    suffix = "K";
  } else {
    suffix = "";
  }

  if (format === "short" && suffix.length > 0) {
    const integerLength = Math.round((magnitude % 1) * 3) || 3;
    const formattedInteger = str.substring(0, integerLength);
    const formattedDecimals = str.substring(
      integerLength,
      integerLength + decimals
    );
    if (decimals > 0) {
      return `${formattedInteger}.${formattedDecimals}${suffix}`;
    } else {
      return `${formattedInteger}${suffix}`;
    }
  } else {
    let formatted = [];
    for (let i = str.length - 1; i >= 0; i--) {
      formatted.push(str[i]);
      if ((str.length - i) % 3 === 0 && i !== 0) {
        formatted.push(separator);
      }
    }
    return formatted.reverse().join("");
  }
};

const HELP_ARG = createArg("Help", "-h", "--help");
const IGNORE_COMMENTS_ARG = createArg(
  "Ignore Comments",
  "-ic",
  "--ignore-comments",
  "Ignore lines with comments in input files."
);
const FILE_ARG = createArg(
  "Output",
  "-o",
  "--output",
  "The output file. Defaults to the working directory.",
  true
);
const LIMIT_ARG = createArg(
  "Limit",
  "-l",
  "--limit",
  "Limit the output to a maximum of this many lines.",
  true
);
const FORMAT_ARG = createArg(
  "Format",
  "-f",
  "--format",
  'Describes the character set and format of the resulting output file.\n\t\t"blue" Insert static word blue into every combination.\n\t\t"[red,blue]" Iterate the words red and blue.\n\t\t"[0-9]" Iterate one character over 0-9.\n\t\t"[a-z]{4}" Iterate 4 characters over a-z.\n\t\t"[a-z,A-Z,0-9, ,:]{2}" Iterate 2 characters over a-zA-Z0-9 :.\n\t\t"[A-Z]{5,6}" Iterate 5-6 characters over A-Z.\n\t\t"[2020-2023]{11,12}" Iterate 11-12 characters over 2020-2023.\n\t\t"[%0] Iterate input wordlist, requires -w argument."\n\t\t[a-z]{2}[0-9]|[0-9] Iterate [a-z]{2}[0-9] entirely, then 0-9 entirely. | represents an OR operation. Can be infinitely. Shuffle only shuffles tokens within each OR block exclusively.\n\n\t\tExample\n\t\t"[0-9]blue[A-Z,a-z]{2,4}[red,blue]"\n\t\t\tFirst word would be 0blueAAred.\n\t\t\tLast word would be 9bluezzzzblue.',
  true
);
const SHUFFLE_ARG = createArg(
  "Shuffle",
  "-sh",
  "--shuffle",
  `In addition to iteration, shuffle the individual tokens provided by the input format.\n\t\tFor example, "[1]blue[a]" would normally only output 1bluea.\n\t\tShuffle outputs 1bluea, 1ablue, ablue1, etc.`
);
const ALTERNATES_ARG = createArg(
  "Alternates",
  "-a",
  "--alternates",
  "Insert common alphanumeric alternates. Will filter out duplicates.\n\t\tFor example, t is commonly replaced with 7.\n\t\ta is commonly replaced with A."
);
const GZIP_ARG = createArg(
  "Gzip",
  "-z",
  "--gzip",
  "Compress output with gzip compression."
);
const DUPLICATES_ARG = createArg(
  "Duplicates",
  "-du",
  "--duplicates",
  "Set the maximum times the same character can appear in a row on a single line.",
  true
);
const STD_OUT_ARG = createArg(
  "Standard Out",
  "-s",
  "--stdout",
  "Output to stdout instead of file."
);
const MIN_LENGTH_ARG = createArg(
  "Minimum Length",
  "-mi",
  "--min",
  "Minimum line length.",
  true
);
const MAX_LENGTH_ARG = createArg(
  "Maximum Length",
  "-ma",
  "--max",
  "Maximum line length.",
  true
);
const DEBUG_ARG = createArg(
  "Debug",
  "-d",
  "--debug",
  "Enable debug mode. Outputs debug information. Does not output words."
);
const LINES_PER_SECOND_ARG = createArg(
  "Lines Per Second",
  "-li",
  "--lps",
  "Output processing time based on lines per second.",
  true
);
const LIST_ARG = createArg(
  "Word List",
  "-w",
  "--wordlist",
  "The input wordlist. Referenced via [%0].",
  true
);

const appArgs = [
  HELP_ARG,
  FILE_ARG,
  LIMIT_ARG,
  SHUFFLE_ARG,
  ALTERNATES_ARG,
  FORMAT_ARG,
  GZIP_ARG,
  DUPLICATES_ARG,
  STD_OUT_ARG,
  MIN_LENGTH_ARG,
  MAX_LENGTH_ARG,
  LINES_PER_SECOND_ARG,
  DEBUG_ARG,
  LIST_ARG,
  IGNORE_COMMENTS_ARG,
];

const log = (...args) => {
  if (!hasArg(STD_OUT_ARG)) {
    console.log(...args);
  }
};
const instanceArgs = {};
const addArg = (arg) => {
  if (!(arg.key in instanceArgs)) {
    instanceArgs[arg.key] = [];
  }
  instanceArgs[arg.key].push(arg);
};
const getArg = (arg1, index = 0) => {
  let i = 0;
  for (const argArray of Object.values(instanceArgs)) {
    for (const arg2 of argArray) {
      if (arg1.key === arg2.key || arg1.altKey === arg2.key) {
        if (i === index) {
          return arg2;
        }
        i += 1;
      }
    }
  }
};
const hasArg = (arg1) => Boolean(getArg(arg1));
const instanceArgCount = () =>
  Object.values(instanceArgs).reduce(
    (prev, current) => prev + current.length,
    0
  );

let currentArg = undefined;
for (let i = 0; i < arguments.length; i++) {
  const value = arguments[i];
  const isArg = value.startsWith("-");
  if (isArg) {
    const appArg = appArgs.find((arg) => equalsArg(value, arg));
    const instanceHasArg =
      Object.keys(instanceArgs).findIndex(
        (arg) => value === arg.key || value === arg.altKey
      ) > -1;
    const isValidArg = Boolean(appArg) && !instanceHasArg;
    const obj = { key: value, altKey: appArg?.altKey, value: undefined };
    if (isValidArg) {
      if (appArg.requiresValue) {
        currentArg = obj;
      } else {
        addArg(obj);
      }
    } else {
      console.error(`Invalid arg ${value}`);
      process.exit();
    }
  } else {
    if (typeof currentArg === "undefined") {
      console.error(`Invalid arg syntax`);
      process.exit();
    }
    const appArg = appArgs.find((arg) => equalsArg(currentArg.key, arg));
    if (!appArg.requiresValue) {
      console.error(`Invalid arg syntax`);
      process.exit();
    }
    currentArg.value = value;
    addArg(currentArg);
    currentArg = undefined;
  }
}
if (typeof currentArg !== "undefined") {
  console.error(`Invalid arg ${currentArg.key}`);
  process.exit();
}

if (hasArg(HELP_ARG) || instanceArgCount() === 0) {
  console.log("munch");
  console.log("");
  console.log("Generate a list of words based on an input format.");
  console.log("");
  console.log("Usage: munch.js");
  Object.values(appArgs).forEach((arg) =>
    console.log(`\t${arg.key}, ${arg.altKey} ${arg.description || ""}`)
  );
  process.exit();
}

const formatArg = getArg(FORMAT_ARG);
if (!formatArg) {
  console.error(`${FORMAT_ARG.name} is required.`);
  process.exit();
}

const fileArg = getArg(FILE_ARG);
const limitArg = getArg(LIMIT_ARG);
const shuffleArg = getArg(SHUFFLE_ARG);
const alternatesArg = getArg(ALTERNATES_ARG);
const duplicatesArg = getArg(DUPLICATES_ARG);
const gzipArg = getArg(GZIP_ARG);
const stdOutArg = getArg(STD_OUT_ARG);
const minArg = getArg(MIN_LENGTH_ARG);
const maxArg = getArg(MAX_LENGTH_ARG);
const debugArg = getArg(DEBUG_ARG);
// const wordlistArg = getArg(LIST_ARG);
const linesPerSecondArg = getArg(LINES_PER_SECOND_ARG);
const ignoreCommentsArg = getArg(IGNORE_COMMENTS_ARG);
const maxLines = limitArg?.value || -1;

if (fileArg && stdOutArg) {
  console.error(
    `Only 1 of ${FILE_ARG.name} or ${STD_OUT_ARG.name} can be specified.`
  );
  process.exit();
}
if (stdOutArg && gzipArg) {
  console.error(`stdout cannot be gzipped.`);
  process.exit();
}

let wordlists = [];
let wordlistObj = {};
let wordListExists = true,
  i = 0;
while (wordListExists) {
  const wordListArg = getArg(LIST_ARG, i);
  if (!wordListArg?.value) {
    wordListExists = false;
    break;
  }

  const hasFile = wordListArg?.value in wordlistObj;
  let data;

  if (!hasFile) {
    const file =
      wordListArg?.value in wordlistObj
        ? wordlistObj[wordListArg?.value]
        : fs.readFileSync(wordListArg?.value);
    if (!file) {
      console.error(`Error while reading wordlist ${wordListArg?.value}`);
      process.exit();
    }
    const lineEndings = file.includes("\r\n") ? "\r\n" : "\n";

    if (hasArg(IGNORE_COMMENTS_ARG)) {
      data = [];
      for (const line of file.toString().split(lineEndings)) {
        if (isComment(line)) {
          continue;
        }
        data.push(line);
      }
    } else {
      data = file.toString().split(lineEndings);
    }
  } else {
    data = wordlistObj[wordListArg?.value];
  }
  wordlistObj[wordListArg?.value] = data;
  wordlists.push(data);
  i += 1;
}

const isWordListToken = (token) => {
  const regex = new RegExp(/^%[0-9]+$/g);
  const [wordListToken] = token.trim().match(regex) || [];
  return Boolean(wordListToken);
};

const getWordList = (token) => {
  if (!isWordListToken(token)) {
    return undefined;
  }
  const index = Number(token.substring(1));
  return wordlists[index];
};

const createStatic = (token) => ({
  type: "static",
  string: token,
});

const createGenerative = (
  charset,
  minLength = 1,
  maxLength = 1,
  alternates = false
) => {
  let parts = [];
  charset.split(/(?<!\\),/g).map((chars) => {
    const shorthandRegex = new RegExp(/(?<!\\)-/g);
    const hasShorthand = shorthandRegex.test(chars);
    let range = [];

    if (hasShorthand) {
      let [startChar, endChar] = chars.split(/(?<!\\)-/g);
      startChar = unescape(startChar);
      endChar = unescape(endChar);

      if (!startChar || !endChar) {
        console.error(
          `Syntax error, ${charset}, need a valid character before and after dash`
        );
        process.exit();
      }

      if (startChar.length === 1 && endChar.length === 1) {
        // ascii
        const startCharCode = startChar.charCodeAt(0);
        const endCharCode = endChar.charCodeAt(0);

        if (endCharCode < startCharCode) {
          console.error(
            `Syntax error, ${charset}, end character is before start character`
          );
          process.exit();
        }

        for (let j = startCharCode; j <= endCharCode; j++) {
          range.push(String.fromCharCode(j));
        }
      } else {
        // sequential
        const startCharNum = Number(startChar);
        const endCharNum = Number(endChar);

        if (Number.isNaN(startCharNum) || Number.isNaN(endCharNum)) {
          console.error(
            `Syntax error, ${charset}, only numbers supported for multiple character ranges, like 1997-2000`
          );
          process.exit();
        }
        if (endCharNum < startCharNum) {
          console.error(
            `Syntax error, ${charset}, end number is before start number`
          );
          process.exit();
        }
        const strLength = Math.max(startChar.length, endChar.length);
        const shouldLeftPad = startChar.length === endChar.length;
        for (let j = startCharNum; j <= endCharNum; j++) {
          let char = String(j);
          if (shouldLeftPad) {
            while (char.length < strLength) {
              char = `0${char}`;
            }
          }
          range.push(char);
        }
      }
    } else {
      if (isWordListToken(chars)) {
        const wordlist = getWordList(chars);
        if (!wordlist) {
          console.error(
            "Wordlist referenced with %0 but not specified via -w."
          );
          process.exit();
        }
        range = wordlist;
      } else {
        range = [unescape(chars)];
      }
    }

    if (alternates) {
      const alts = getAlternates(range);
      parts = parts.concat(alts.flat(), range);
    } else {
      parts = parts.concat(range);
    }
  });

  parts = [...new Set(parts)];

  return {
    type: "generative",
    charset: parts,
    minLength,
    maxLength,
  };
};

function parseFormatGroup(format) {
  const chars = format.split("");
  let parts = [];
  let part = "";
  let square = undefined;
  let curly = undefined;
  let squareLeftBracket = false;
  let curlyLeftBracket = false;

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    let didCompleteSequence = false;
    const isEscaped = chars[i - 1] === "\\";

    if (char === "[" && !isEscaped) {
      if (squareLeftBracket) {
        console.error(
          `Syntax error, 2 consecutive [ without closing ] at index ${i}`
        );
        process.exit();
      }
      if (part.length > 0) {
        parts.push(createStatic(part));
        part = "";
      }
      squareLeftBracket = true;
      didStartSequence = true;
      isMetaChar = true;
    } else if (char === "{" && !isEscaped) {
      if (curlyLeftBracket) {
        console.error(
          `Syntax error, 2 consecutive { without closing } at index ${i}`
        );
        process.exit();
      }
      if (part.length > 0) {
        parts.push(createStatic(part));
        part = "";
      }
      curlyLeftBracket = true;
      didStartSequence = true;
      isMetaChar = true;
    } else if (char === "]" && !isEscaped) {
      if (!squareLeftBracket) {
        console.error(`Syntax error, found ] without opening [ at index ${i}`);
        process.exit();
      }
      squareLeftBracket = false;
      square = part + char;
      part = "";
      didCompleteSequence = true;

      isMetaChar = true;
    } else if (char === "}" && !isEscaped) {
      if (!curlyLeftBracket) {
        console.error(`Syntax error, found } without opening { at index ${i}`);
        process.exit();
      }
      curlyLeftBracket = false;
      curly = part + char;
      part = "";
      didCompleteSequence = true;
      isMetaChar = true;
    }

    if (curly) {
      const [min, max] = curly.substring(1, curly.length - 1).split(",");
      const minNum = !min || min.length === 0 ? 1 : Number(min);
      const maxNum = !max || max.length === 0 ? minNum : Number(max);
      if (Number.isNaN(minNum)) {
        console.error(`Syntax error, min is not a number at index ${i - 1}`);
        process.exit();
      } else if (Number.isNaN(maxNum)) {
        console.error(`Syntax error, max is not a number at index ${i - 1}`);
        process.exit();
      } else if (minNum > maxNum) {
        console.error(
          `Syntax error, min is greater than max at index ${i - 1}`
        );
        process.exit();
      }
      parts.push(
        createGenerative(
          square.substring(1, square.length - 1),
          minNum,
          maxNum,
          alternatesArg
        )
      );
      curly = undefined;
      square = undefined;
      part = "";
    } else if (square && !curlyLeftBracket && chars[i + 1] !== "{") {
      const tokens = square.substring(1, square.length - 1).split("|");
      const results = tokens.map((token) => {
        const shorthandRegex = new RegExp(/(?<!\\)-|(?<!\\),/g);
        const hasShorthand = shorthandRegex.test(token);
        if (hasShorthand) {
          return createGenerative(token, 1, 1, alternatesArg);
        } else {
          if (alternatesArg) {
            if (isWordListToken(token)) {
              const wordlist = getWordList(token);
              if (!wordlist) {
                console.error(
                  "Wordlist referenced with %0 but not specified via -w."
                );
                process.exit();
              }

              const lines = [];
              for (const line of wordlist) {
                const alternates = getAlternates(line);
                lines = lines.concat(alternates.map(createStatic));
              }
              return lines;
            } else {
              return getAlternates(token).map(createStatic);
            }
          }
          if (isWordListToken(token)) {
            const wordlist = getWordList(token);
            if (!wordlist) {
              console.error(
                "Wordlist referenced with %0 but not specified via -w."
              );
              process.exit();
            }
            return createStatic(wordlist);
          }
          return createStatic(token);
        }
      });
      parts.push(results.flat());
      square = undefined;
      part = "";
    }

    if (!didCompleteSequence) {
      part += char;
    }

    if (i === chars.length - 1 && part.length > 0) {
      if (alternatesArg) {
        const alternates = getAlternates(part).map((t) => createStatic(t));
        parts.push(alternates);
      } else {
        parts.push(createStatic(part));
      }
    }
  }
  return parts;
}

const getChars = ({ type, string, minLength, maxLength, charset }) => {
  if (type === "static") {
    return [string];
  } else {
    const arrLength = Math.max(1, maxLength || 0);
    return new Array(arrLength).fill(0).map((_, index) => {
      const canBeUndefined = index + 1 > minLength;
      const arr = canBeUndefined ? [undefined] : [];
      return charset.concat(arr);
    });
  }
};

function parseStringsGroups(parts) {
  let strings = [];
  for (let i = 0; i < parts.length; i++) {
    const value = parts[i];
    let current;
    if (Array.isArray(value)) {
      current = value.map(getChars).flat();
    } else {
      current = getChars(value);
    }
    const shouldConcat = Array.isArray(current[0]);
    if (shouldConcat) {
      strings = strings.concat(current);
    } else {
      strings.push(current);
    }
  }
  return strings;
}

let currentStream;

const closeStream = async () => {
  if (!currentStream?.closed) {
    await new Promise((resolve) => currentStream.end(resolve));
    log(`Done.`);
  }
};
const quitProcess = async () => {
  await closeStream();
  process.exit(0);
};

[
  "SIGHUP",
  "SIGINT",
  "SIGQUIT",
  "SIGILL",
  "SIGTRAP",
  "SIGABRT",
  "SIGBUS",
  "SIGFPE",
  "SIGUSR1",
  "SIGSEGV",
  "SIGUSR2",
  "SIGTERM",
].forEach((signal) => process.on(signal, quitProcess));

process.on("error", console.error);

async function permutateStringsGroup(parts, strings, index) {
  const extension = gzipArg ? ".gz" : "";
  const suffix = `${index + 1}`;
  let filename = `output${index + 1}.txt${extension}`;
  let filepath = fileArg?.value;
  if (filepath) {
    const providedFileName = path.basename(filepath);
    if (providedFileName) {
      const [name, ...ext] = providedFileName.split(".");
      filename = `${name}${suffix}.${ext.join(".")}`;
    }
    filepath = path.dirname(filepath);
    filepath = path.normalize(filepath);
  } else {
    filepath = path.resolve(process.cwd());
  }
  let outputPath = path.join(filepath, filename);
  const writeStream = stdOutArg
    ? process.stdout
    : fs.createWriteStream(outputPath);
  const gzip = gzipArg ? zlib.createGzip() : undefined;
  const stream = gzip || writeStream;
  if (gzipArg) {
    gzip.pipe(writeStream);
  }
  currentStream = gzip || writeStream;

  const permutations = getPermutationCount(strings);
  let divisors = getPermutationDivisors(strings);
  const lineCount =
    maxLines !== -1 ? Math.min(maxLines, permutations) : permutations;
  const maxDuplicates = Number.isNaN(duplicatesArg?.value)
    ? 0
    : Number(duplicatesArg?.value);
  const minLength = Number.isNaN(minArg?.value)
    ? undefined
    : Number(minArg?.value);
  const maxLength = Number.isNaN(maxArg?.value)
    ? undefined
    : Number(maxArg?.value);

  const shufflePermutationsSource = new Array(strings.length)
    .fill(0)
    .map((_, index) => index)
    .reduce((prev, _, __, arr) => {
      prev.push(arr);
      return prev;
    }, []);
  const uniqueShufflePermutations = shuffleArg
    ? getUniquePermutationCount(strings)
    : 1;
  const shufflePermutations = shuffleArg ? strings.length ** strings.length : 1;
  const shufflePermutationsDivisors = getPermutationDivisors(
    shufflePermutationsSource
  );
  let lines = 0;
  let shuffleLine = 0;
  let usedShuffleIndexes = [];

  let hasDuplicates = false;
  function* permutationGenerator() {
    while (lines < lineCount * uniqueShufflePermutations) {
      let line;

      if (shuffleArg) {
        let curLine = lines - Math.floor(lines / lineCount) * lineCount;

        if (lines % lineCount === 0) {
          hasDuplicates = true;
          let shuffledStringsIndexes;

          while (hasDuplicates && shuffleLine < shufflePermutations) {
            shuffleLine += 1;
            shuffledStringsIndexes = getPermutation(
              shufflePermutationsSource,
              shufflePermutationsDivisors,
              shuffleLine
            );
            const indexes = shuffledStringsIndexes.split("");
            const id = indexes.map((i) => strings[Number(i)]).join("");

            hasDuplicates =
              [...new Set(indexes)].length !== shuffledStringsIndexes.length ||
              usedShuffleIndexes.includes(id);
            if (!hasDuplicates) {
              usedShuffleIndexes.push(id);
            }
          }
        }

        const shuffledStringsIndexes = getPermutation(
          shufflePermutationsSource,
          shufflePermutationsDivisors,
          shuffleLine
        );
        const shuffledStrings = shuffledStringsIndexes
          .split("")
          .reduce((prev, current) => {
            prev.push(strings[Number(current)]);
            return prev;
          }, []);

        divisors = getPermutationDivisors(shuffledStrings);
        line = getPermutation(shuffledStrings, divisors, curLine);
      } else {
        line = getPermutation(strings, divisors, lines);
      }
      let shouldWriteLine = true;

      if (!hasDuplicates) {
        if (maxDuplicates) {
          let occurrences = 0;
          let c = "";
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const isDuplicate = char === c;
            if (isDuplicate) {
              occurrences += 1;
            } else {
              c = char;
              occurrences = 1;
            }
            if (occurrences >= maxDuplicates) {
              shouldWriteLine = false;
              break;
            }
          }
        }
        if (minLength) {
          if (line.length < minLength) {
            shouldWriteLine = false;
          }
        }
        if (maxLength) {
          if (line.length > maxLength) {
            shouldWriteLine = false;
          }
        }
      }

      lines += 1;
      if (!stdOutArg && lineCount >= 2000000 && lines % 1000000 === 0) {
        log(
          `Wrote line ${prettyNumber(lines + 1)}. ${
            Math.floor((lines / (lineCount * shufflePermutations)) * 1000000) /
            10000
          }%.`
        );
      }

      if (shouldWriteLine && !hasDuplicates) {
        const nl = lines === 1 ? "" : "\n";
        yield `${nl}${line}`;
      } else {
        yield Buffer.from([]);
      }
    }
  }

  if (debugArg) {
    log(instanceArgs);
    console.dir(parts, { depth: null });
    log(strings);
    log(`${prettyNumber(permutations * uniqueShufflePermutations)} lines.`);
  }

  if (linesPerSecondArg) {
    const lps = Number.isNaN(linesPerSecondArg?.value)
      ? undefined
      : Number(linesPerSecondArg?.value);
    if (lps) {
      const { interval, time } = prettyTime(
        (lineCount * shufflePermutations) / lps
      );
      const timeStr = prettyNumber(time);
      log(`${timeStr} ${interval}.`);
    }
  }

  if (debugArg) {
    return;
  }

  log(`Writing ${prettyNumber(lineCount * shufflePermutations)} lines...`);
  const readStream = Readable.from(permutationGenerator());
  readStream.pipe(stream);
  readStream.on("end", closeStream);
  await new Promise((resolve) => readStream.once("end", resolve));
}

(async () => {
  const format = formatArg.value.split("|");
  const partsGroups = format.map((f) => parseFormatGroup(f));
  const stringsGroups = partsGroups.map((p) => parseStringsGroups(p));
  let i = 0;
  for await (let strings of stringsGroups) {
    await permutateStringsGroup(partsGroups[i], strings, i);
    i += 1;
  }
})();

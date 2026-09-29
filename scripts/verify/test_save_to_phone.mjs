import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const REPO = fileURLToPath(new URL("../..", import.meta.url));

// ---------------------------------------------------------------------------
// Regression test for "Save photos to my phone" — the route that puts a guest's
// own originals back on their device.
//
// This logic cannot be exercised in a real browser here, and getting it wrong
// is invisible until someone is standing at a wedding with no copy of their
// photo. So the decision function is pure and asserted directly:
//
//   * a browser that can share a batch gets one sheet,
//   * one that only accepts a single file gets a sheet per file (never a
//     silent downgrade to downloads, which iOS Safari handles badly),
//   * one with no share support at all gets downloads,
//   * an empty selection never claims it can share.
//
// The module is read and type-stripped rather than imported, because Node
// cannot load the TypeScript source and there is no bundler in this harness.
// Stripping is structural — the parameter list is replaced wholesale after
// matching parentheses/brackets — because the signatures are wrapped across
// several lines and text replacements kept missing them.
// ---------------------------------------------------------------------------

/** Pull one `export function` out of a TS module, typed signature and all. */
function extractFunction(source, name, jsParams) {
  const start = source.indexOf(`export function ${name}`);
  if (start === -1) throw new Error(`${name} not found — did it move?`);

  const matchDelimiter = (openIndex, open, close) => {
    let depth = 0;
    for (let i = openIndex; i < source.length; i += 1) {
      if (source[i] === open) depth += 1;
      else if (source[i] === close) {
        depth -= 1;
        if (depth === 0) return i;
      }
    }
    throw new Error(`unbalanced ${open}${close} in ${name}`);
  };

  const openParen = source.indexOf("(", start);
  const closeParen = matchDelimiter(openParen, "(", ")");
  const bodyOpen = source.indexOf("{", closeParen);
  const bodyClose = matchDelimiter(bodyOpen, "{", "}");

  return `function ${name}${jsParams} ${source.slice(bodyOpen, bodyClose + 1)}`;
}

const source = readFileSync(REPO + "src/lib/guest/saveToPhone.ts", "utf8");

const pickSaveStrategy = new Function(
  `${extractFunction(source, "pickSaveStrategy", "(files, canShare)")}; return pickSaveStrategy;`
)();

const canShareFiles = new Function(
  `${extractFunction(source, "canShareFiles", "(files)")}; return canShareFiles;`
)();

const photo = (name) => ({ name, type: "image/jpeg", size: 1024 });
const one = [photo("a.jpg")];
const two = [photo("a.jpg"), photo("b.jpg")];

const cases = [
  {
    name: "batch share supported → a single sheet",
    files: two,
    canShare: () => true,
    expected: "share",
  },
  {
    name: "only single-file share supported → sheet per file",
    files: two,
    canShare: (files) => files.length === 1,
    expected: "share-each",
  },
  {
    name: "no share support → downloads",
    files: two,
    canShare: () => false,
    expected: "download",
  },
  {
    name: "single file, share supported → a single sheet",
    files: one,
    canShare: () => true,
    expected: "share",
  },
  {
    name: "single file, no share support → downloads",
    files: one,
    canShare: () => false,
    expected: "download",
  },
  {
    name: "empty selection never claims a share",
    files: [],
    canShare: () => true,
    expected: "download",
  },
];

let failures = 0;
for (const testCase of cases) {
  const actual = pickSaveStrategy(testCase.files, testCase.canShare);
  const ok = actual === testCase.expected;
  if (!ok) failures += 1;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${testCase.name} → ${actual}${ok ? "" : ` (wanted ${testCase.expected})`}`
  );
}

// `canShareFiles` has to survive the three ways `navigator.canShare` misbehaves:
// missing (desktop Safari), throwing (it validates the payload), and saying no.
const navigatorCases = [
  { name: "no navigator.canShare", nav: {}, files: one, expected: false },
  {
    name: "canShare throws",
    nav: {
      canShare: () => {
        throw new TypeError("bad payload");
      },
    },
    files: one,
    expected: false,
  },
  { name: "canShare says no", nav: { canShare: () => false }, files: one, expected: false },
  { name: "canShare says yes", nav: { canShare: () => true }, files: one, expected: true },
  { name: "no files to share", nav: { canShare: () => true }, files: [], expected: false },
];

// Node 22 defines `navigator` as a getter, so it can only be replaced with
// defineProperty — a plain assignment throws in strict mode.
for (const testCase of navigatorCases) {
  Object.defineProperty(globalThis, "navigator", {
    value: testCase.nav,
    configurable: true,
    writable: true,
  });
  const actual = canShareFiles(testCase.files);
  const ok = actual === testCase.expected;
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  canShareFiles: ${testCase.name} → ${actual}`);
}

Object.defineProperty(globalThis, "navigator", { value: undefined, configurable: true });

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nALL CHECKS PASSED — save-to-phone strategy matrix holds.");

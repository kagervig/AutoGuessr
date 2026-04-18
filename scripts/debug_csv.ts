import fs from "fs";
import { parse } from "csv-parse/sync";

const CSV_PATH = "/Users/kristianallin/Downloads/images_to_process.csv";

const content = fs.readFileSync(CSV_PATH, "utf-8");
const lines = content.split("\n");

let current = "";
const expectedCount = 39;
for (let i = 0; i < lines.length; i++) {
  current += lines[i];
  try {
    const records = parse(current, { columns: false });
    if (records.length > 0) {
      if (records[0].length !== expectedCount) {
        console.log(`Row ${i + 1} has ${records[0].length} columns (expected ${expectedCount})`);
        console.log(`Row: ${current}`);
      }
      current = "";
    }
  } catch (err) {
    if (err.message.includes("QUOTE_NOT_CLOSED")) {
      current += "\n";
      continue;
    }
    console.log(`Error at line ${i + 1}: ${err.message}`);
    process.exit(1);
  }
}
console.log("No parse error found line-by-line.");

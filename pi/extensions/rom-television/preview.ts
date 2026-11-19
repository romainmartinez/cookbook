import { readFileSync } from "node:fs";
import { transcript } from "./sessions.ts";

const sessionPath = readFileSync(process.argv[2], "utf8");
process.stdout.write(transcript(readFileSync(sessionPath, "utf8")));

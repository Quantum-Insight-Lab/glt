#!/usr/bin/env node
import { run } from "./index.ts";

const result = await run(process.argv.slice(2), { isTty: process.stdout.isTTY === true });
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
process.exit(result.code);

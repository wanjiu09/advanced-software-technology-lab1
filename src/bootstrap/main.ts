import { CliApplication } from './CliApplication.js';

await new CliApplication()
  .createRepl(process.stdin, process.stdout, Boolean(process.stdin.isTTY && process.stdout.isTTY))
  .run();

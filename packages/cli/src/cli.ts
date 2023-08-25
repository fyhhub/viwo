import { Cli } from 'clipanion';
import { BundlessCommand } from './commands/bundless';

const [node, app, ...args] = process.argv;

const cli = new Cli({
  binaryLabel: `Viwo`,
  binaryName: `${node} ${app}`,
  binaryVersion: `1.0.0`
});

cli.register(BundlessCommand);
cli.runExit(args);

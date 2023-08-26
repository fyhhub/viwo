import { Command, Option } from 'clipanion';
import { bundless } from '../bundless';
import '../builder';
export class BundlessCommand extends Command {
  static paths = [[`bundless`]];
  watch = Option.Boolean(`--watch`);
  async execute() {
    bundless({
      input: './packages/cli/src',
      root: process.cwd(),
      format: 'esm',
      output: './packages/cli/lib',
      watch: this.watch
    });
  }
}

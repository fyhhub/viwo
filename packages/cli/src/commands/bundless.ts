import { Command, Option } from 'clipanion';
import { bundless } from '../bundless';
import path from 'path';
export class BundlessCommand extends Command {
  static paths = [[`bundless`]];
  watch = Option.Boolean(`--watch`);
  async execute() {
    // process.env.FATHER_CACHE = this.watch ? 'true' : 'none';
    bundless({
      input: './src',
      root: process.cwd(),
      format: 'esm',
      output: './lib',
      watch: this.watch,
      clean: false,
      transformer: 'swc',
      alias: {
        '@': path.resolve(process.cwd(), './src')
      },
      vue: 3
    });
  }
}

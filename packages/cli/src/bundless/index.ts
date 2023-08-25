import { ViwoBundlessConfig } from './types';
import chalk from 'chalk';
async function bundless(opts: ViwoBundlessConfig) {
  const statusText = `Bundless for ${chalk.yellow(
    opts.input
  )} directory to ${chalk.yellow(opts.format)} format`;
}

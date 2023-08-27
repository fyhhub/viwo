import { DEFAULT_BUNDLESS_IGNORES, WATCH_DEBOUNCE_STEP } from '../constants';
import { createLogger } from '../utils/logger';
import { ViwoBundlessConfig } from './types';
import chalk from 'chalk';
import { sync } from 'glob';
import { getPkgPath, replacePathExt } from '../utils/index';
import { createDebugger } from '../utils/debug';
import path from 'path';
import fs from 'fs';
import { runLoaders } from './loaders';
import { chokidar, lodash, rimraf, winPath } from '@umijs/utils';
import getDeclarations from './dts';
import { initialLoaders } from '../builder';

const logger = createLogger('info');
const debug = createDebugger(`viwo:config`);

async function transformFiles(
  params: {
    matches: string[];
    pkg: Record<string, any>;
  },
  opts: ViwoBundlessConfig
) {
  try {
    const { matches, pkg } = params;
    debug('matches', matches);
    let count = 0;
    const declarationFileMap = new Map<string, string>();

    await Promise.all(
      params.matches.map(async item => {
        const itemAbsPath = path.join(opts.root!, item);
        let itemDistPath = path.join(
          opts.output!,
          path.relative(opts.input!, item)
        );
        let itemDistAbsPath = path.join(opts.root!, itemDistPath);
        debug('distPath', itemDistAbsPath);
        const parentPath = path.dirname(itemDistPath);

        if (!fs.existsSync(parentPath)) {
          fs.mkdirSync(parentPath, { recursive: true });
        }
        const result = await runLoaders(itemAbsPath, {
          config: opts,
          pkg,
          itemDistAbsPath
        });
        if (result) {
          debug('runLoaders', result.options);
          // update ext if loader specified
          if (result.options.ext) {
            itemDistPath = replacePathExt(itemDistPath, result.options.ext);
            itemDistAbsPath = replacePathExt(
              itemDistAbsPath,
              result.options.ext
            );
          }

          // prepare for declaration
          if (result.options.declaration) {
            // use winPath because ts compiler will convert to posix path
            declarationFileMap.set(winPath(itemAbsPath), parentPath);
          }

          if (result.options.map) {
            const map = result.options.map;
            const mapLoc = `${itemDistAbsPath}.map`;

            fs.writeFileSync(mapLoc, map);
          }

          // distribute file with result
          fs.writeFileSync(itemDistAbsPath, result.content);
        } else {
          // copy file as normal assets
          fs.copyFileSync(itemAbsPath, itemDistAbsPath);
        }

        logger.info(
          `Bundless ${chalk.gray(item)} to ${chalk.gray(itemDistPath)}${
            result?.options.declaration ? ' (with declaration)' : ''
          }`
        );
        count += 1;
      })
    );

    if (declarationFileMap.size) {
      logger.info(
        `Generate declaration file${declarationFileMap.size > 1 ? 's' : ''}...`
      );

      const declarations = await getDeclarations(
        [...declarationFileMap.keys()],
        {
          cwd: opts.root!
        }
      );

      declarations.forEach((item: any) => {
        fs.writeFileSync(
          path.join(declarationFileMap.get(item.sourceFile)!, item.file),
          item.content,
          'utf-8'
        );
      });
    }

    return count;
  } catch (err: any) {
    if (opts.watch) {
      logger.error(err.message);
      return 0;
    } else {
      throw err;
    }
  }
}

export async function bundless(opts: ViwoBundlessConfig) {
  const statusText = `Bundless for ${chalk.yellow(
    opts.input
  )} directory to ${chalk.yellow(opts.format)} format`;

  logger.info(statusText);

  const startTime = Date.now();
  opts.root = opts.root ?? process.cwd();
  opts.platform = opts.platform ?? 'browser';

  debug('config', opts);
  const pkgPath = getPkgPath();

  if (!pkgPath) {
    logger.error('No package.json found');
  }

  debug('pkgPath', pkgPath);
  const pkg = pkgPath ? require(pkgPath) : {};

  const distDir = path.join(opts.root!, opts.output!);
  if (opts.clean && fs.existsSync(distDir)) {
    rimraf.sync(distDir);
    logger.info('Remove Dist ' + distDir);
  }

  initialLoaders(opts);

  const matches = sync(`${opts.input}/**`, {
    cwd: opts.root || process.cwd(),
    ignore: DEFAULT_BUNDLESS_IGNORES,
    nodir: true
  });

  const count = await transformFiles(
    {
      matches,
      pkg
    },
    opts
  );

  if (!opts.watch) {
    // output result for normal mode
    logger.info(
      `Transformed successfully in ${
        Date.now() - startTime
      } ms (${count} files)`
    );
  } else {
    // watching for watch mode
    logger.info(`Start watching ${opts.input} directory...`);

    // debounce transform to combine multiple changes
    const handleTransform = (() => {
      const pendingSet = new Set<string>();
      const startTransform = lodash.debounce(() => {
        transformFiles(
          {
            matches: [...pendingSet],
            pkg
          },
          opts
        );
        pendingSet.clear();
        logger.info(statusText);
      }, WATCH_DEBOUNCE_STEP);

      return (filePath: string) => {
        pendingSet.add(filePath);
        startTransform();
      };
    })();
    const watcher = chokidar
      .watch(opts.input!, {
        cwd: opts.root,
        ignoreInitial: true,
        ignored: DEFAULT_BUNDLESS_IGNORES
      })
      .on('add', handleTransform)
      .on('change', handleTransform)
      .on('unlink', rltFilePath => {
        const isTsFile = /\.tsx?$/.test(rltFilePath);
        const fileDistAbsPath = path.join(
          opts.root!,
          opts.output!,
          path.relative(opts.input!, rltFilePath)
        );
        const relatedFiles = isTsFile
          ? [
              replacePathExt(fileDistAbsPath, '.js'),
              replacePathExt(fileDistAbsPath, '.d.ts'),
              replacePathExt(fileDistAbsPath, '.d.ts.map')
            ]
          : [fileDistAbsPath];
        const relatedMainFile = relatedFiles.find(item => fs.existsSync(item));

        if (relatedMainFile) {
          relatedFiles.forEach(file => rimraf.sync(file));
          logger.info(
            `Bundless ${chalk.gray(
              path.relative(opts.root!, relatedMainFile)
            )} is removed`
          );
        }
      })
      .on('unlinkDir', (rltDirPath: string) => {
        // no config means it was ignored in current compile-time
        // such as esm file in cjs compile-time
        const dirDistAbsPath = path.join(
          opts.root!,
          opts.output!,
          path.relative(opts.input!, rltDirPath)
        );

        // there are file removal logs above, so we don't need to log here
        rimraf.sync(dirDistAbsPath);
      });

    return watcher;
  }
}

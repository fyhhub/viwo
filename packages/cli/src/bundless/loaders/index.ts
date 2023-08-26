import {
  IBundlessLoader,
  ILoaderOutput,
  ViwoBundlessConfig
} from '../../bundless/types';
import { getCache, getTsconfig } from '../../utils';
import fs from 'fs';
import { runLoaders as loaderRunner } from 'loader-runner';

export interface ILoaderItem {
  id: string;
  test: string | RegExp | ((path: string) => boolean);
  loader: any;
  options?: Record<string, any>;
}
const loaders: ILoaderItem[] = [];
/**
 * add loader
 * @param item  loader item
 */
export function addLoader(item: ILoaderItem) {
  if (
    !['string', 'function'].includes(typeof item.test) &&
    !(item.test instanceof RegExp)
  ) {
    throw new Error(
      `Unsupported loader test in \`${item.id}\`, only string, function and regular expression are available.`
    );
  }

  loaders.push(item);
}

export async function runLoaders(
  fileAbsPath: string,
  opts: {
    config: ViwoBundlessConfig;
    itemDistAbsPath: string;
    pkg: Record<string, any>;
  }
) {
  const { config } = opts;

  const cache = getCache('bundless-loader');

  const cacheKey = [
    fileAbsPath,
    fs.statSync(fileAbsPath).mtimeMs,
    JSON.stringify(config),
    // use for babel opts generator in src/builder/utils.ts
    JSON.stringify(
      Object.assign({}, opts.pkg.dependencies, opts.pkg.peerDependencies)
    )
  ].join(':');

  const cacheRet = await cache.get(cacheKey, '');

  if (cacheRet)
    return Promise.resolve<ILoaderOutput>({
      ...cacheRet,
      options: {
        ...cacheRet.options,
        declaration: /\.tsx?$/.test(fileAbsPath)
          ? getTsconfig(config.root!)?.options.declaration
          : false
      }
    });

  const matched = loaders.find(item => {
    switch (typeof item.test) {
      case 'string':
        return fileAbsPath.startsWith(item.test);

      case 'function':
        return item.test(fileAbsPath);

      default:
        // assume it is RegExp instance
        return item.test.test(fileAbsPath);
    }
  });

  if (matched) {
    // run matched loader
    return new Promise<ILoaderOutput | void>((resolve, reject) => {
      let outputOpts: ILoaderOutput['options'] = {};

      loaderRunner(
        {
          resource: fileAbsPath,
          loaders: [{ loader: matched.loader, options: matched.options }],
          context: {
            cwd: config.root,
            config: config,
            pkg: opts.pkg,
            itemDistAbsPath: opts.itemDistAbsPath,
            setOutputOptions(opts: any) {
              outputOpts = opts;
            },
            paths: {
              itemDistAbsPath: opts.itemDistAbsPath,
              fileAbsPath,
              cwd: config.root
            }
          } as Partial<ThisParameterType<IBundlessLoader>>,
          readResource: fs.readFile.bind(fs)
        },
        (err, { result }) => {
          if (err) {
            reject(err);
          } else if (result) {
            const ret = {
              content: result[0] as unknown as string,
              options: outputOpts
            };
            // save cache then resolve
            cache.set(cacheKey, ret);
            resolve(ret);
          } else {
            resolve(void 0);
          }
        }
      );
    });
  }
}

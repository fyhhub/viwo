import Cache from 'file-system-cache';
import { builtinModules } from 'module';
import path, { isAbsolute } from 'path';
import { CACHE_PATH } from '../constants';
import { createHash } from 'crypto';
// @ts-ignore
import { sync as pkgUpSync } from 'pkg-up';

const caches: Record<string, ReturnType<typeof Cache>> = {};

/**
 * get file-system cache for specific namespace
 */
export function getCache(ns: string): (typeof caches)['0'] {
  // return fake cache if cache disabled
  if (process.env.FATHER_CACHE === 'none') {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    return { set() {}, get() {}, setSync() {}, getSync() {} } as any;
  }
  return (caches[ns] =
    caches[ns] ?? Cache({ basePath: path.join(CACHE_PATH, ns) }));
}

/**
 * get valid type field value from package.json
 */
export function getTypeFromPkgJson(
  pkg: Record<string, any>
): string | undefined {
  return pkg.types || pkg.typing || pkg.typings;
}

/**
 * restore xxx for @types/xxx
 */
export function getPkgNameFromTypesOrg(name: string) {
  return name.replace('@types/', '').replace(/^([^]+?)__([^]+)$/, '@$1/$2');
}

/**
 * get @types/xxx for xxx
 */
export function getPkgNameWithTypesOrg(name: string) {
  return `@types/${name.replace('@', '').replace('/', '__')}`;
}

/**
 * get d.ts file path and package path for NPM package.json path
 */
export function getDtsInfoForPkgPath(pkgPath: string) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pkg = require(pkgPath);
  const info = { pkgPath: pkgPath, dtsPath: getTypeFromPkgJson(pkg)! };

  if (info.dtsPath) {
    // resolve builtin types
    info.dtsPath = path.resolve(path.dirname(pkgPath), info.dtsPath);
  } else {
    // resolve @types/xxx pkg
    try {
      info.pkgPath = require.resolve(
        `${getPkgNameWithTypesOrg(pkg.name)}/package.json`,
        {
          paths: [pkgPath]
        }
      );
      info.dtsPath = path.resolve(
        path.dirname(info.pkgPath),
        getTypeFromPkgJson(require(info.pkgPath))!
      );
    } catch {
      return null;
    }
  }

  return info;
}

/**
 * Determine if it is a native module
 */
export const isBuiltInModule = (pkgName: string) =>
  builtinModules.includes(pkgName.replace(/^node:/, ''));

/**
 * get package.json path for specific NPM package
 * @see https://github.com/nodejs/node/issues/33460
 */
export function getDepPkgPath(dep: string, cwd: string) {
  try {
    return require.resolve(`${dep}/package.json`, { paths: [cwd] });
  } catch {
    return pkgUpSync({
      cwd: require.resolve(dep, { paths: [cwd] })
    })!;
  }
}

/**
 * get all nested type dependencies for specific NPM package
 */
export function getNestedTypeDepsForPkg(
  name: string,
  cwd: string,
  externals: Record<string, string>,
  deps?: Record<string, string>
) {
  const isWithinTypes = name.startsWith('@types/');
  const pkgName = isWithinTypes ? getPkgNameFromTypesOrg(name) : name;
  const typesPkgName = isWithinTypes ? name : getPkgNameWithTypesOrg(name);
  const isCollected =
    deps?.hasOwnProperty(name) || deps?.hasOwnProperty(typesPkgName);
  const isExternalized = externals[pkgName] || externals[typesPkgName];

  if (deps && (isCollected || isExternalized)) return deps;

  const isTopLevel = !deps;
  const dtsInfo = getDtsInfoForPkgPath(getDepPkgPath(name, cwd));
  const pkgJson = dtsInfo ? require(dtsInfo.pkgPath) : {};
  const pkgDeps: NonNullable<typeof deps> = pkgJson.dependencies || {};

  // collect nested packages and exclude self
  deps = deps ?? {};
  Object.assign(deps, isTopLevel ? {} : { [pkgJson.name]: pkgJson.version });
  Object.keys(pkgDeps).forEach(item => {
    getNestedTypeDepsForPkg(item, dtsInfo!.pkgPath, externals, deps);
  });

  return deps;
}

export function isFilePath(path: string) {
  return isAbsolute(path) || path.startsWith('.');
}

export function getPkgNameFromPath(p: string) {
  return p.match(/^(?:@[a-z\d][\w-.]*\/)?[a-z\d][\w-.]*/i)?.[0];
}

export const getDepPkgName = (name: string, packageJson: { name: string }) => {
  if (isFilePath(name)) {
    return packageJson.name;
  }
  return getPkgNameFromPath(name) ?? name;
};

export const getPkgPath = () => {
  return pkgUpSync();
};

export function getTsconfig(cwd: string) {
  // use require() rather than import(), to avoid jest runner to fail
  // ref: https://github.com/nodejs/node/issues/35889
  const ts: typeof import('typescript') = require('typescript');
  const tsconfigPath = ts.findConfigFile(cwd, ts.sys.fileExists);

  if (tsconfigPath) {
    const tsconfigFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
    return ts.parseJsonConfigFileContent(
      tsconfigFile.config,
      ts.sys,
      path.dirname(tsconfigPath)
    );
  }
}

export function replacePathExt(filePath: string, ext: string) {
  const parsed = path.parse(filePath);

  return path.join(parsed.dir, `${parsed.name}${ext}`);
}

export function getContentHash(content: string, length = 8) {
  return createHash('md5').update(content).digest('hex').slice(0, length);
}

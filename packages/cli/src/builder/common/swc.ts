import { winPath } from '@umijs/utils';
import { lstatSync } from 'fs';
import path from 'path';
import { IJSLoader } from '../types';
import { addSourceMappingUrl, ensureRelativePath } from '../utils';
import { ViwoBundlessConfig } from '../../bundless/types';

const isTs = (p: string): boolean => p.endsWith('.ts') || p.endsWith('.tsx');

const isDirectory = (path: string) => {
  try {
    return lstatSync(path).isDirectory();
  } catch {
    return false;
  }
};

/**
 * transform alias to relative path for swc paths
 * @param opts
 * @returns {Record<string, string[]>} alias
 */
const getSWCAlias = (opts: {
  fileAbsPath: string;
  alias: ViwoBundlessConfig['alias'];
  cwd: string;
}): Record<string, string[]> => {
  const { fileAbsPath, alias = {}, cwd } = opts;

  return Object.entries(alias).reduce<Record<string, string[]>>(
    (result, [name, target]) => {
      if (path.isAbsolute(target)) {
        const isDirAlias = isDirectory(target);

        let relativePath = winPath(
          isDirAlias
            ? path.relative(cwd, target)
            : path.relative(path.dirname(fileAbsPath), target)
        );
        relativePath = ensureRelativePath(relativePath);

        // suffix * for dir alias
        const aliasName = isDirAlias ? `${name}/*` : name;
        const aliasPath = isDirAlias ? `${relativePath}/*` : relativePath;

        // fit path omit index
        // eg: ./test/index.ts => ./test
        if (isDirAlias) {
          result[name] = [relativePath];
        }

        result[aliasName] = [aliasPath];
      } else {
        result[name] = [target];
      }

      return result;
    },
    {}
  );
};

/**
 * replace absolute path with relative path
 */
export const replaceAbsPathWithRelativePath = (opts: {
  content: string;
  cwd: string;
  fileAbsPath: string;
}) => {
  const cwd = winPath(opts.cwd);
  const fileAbsPath = winPath(opts.fileAbsPath);
  const pathRegex = new RegExp('(\'|")((\\1|.)*?)\\1', 'g');
  const replacer = (oText: string, quote: string, target: string) => {
    if (!target.startsWith(cwd)) {
      return oText;
    }

    let relativePath = winPath(
      path.relative(path.dirname(fileAbsPath), target)
    );
    relativePath = ensureRelativePath(relativePath);

    return `${quote}${relativePath}${quote}`;
  };
  return opts.content.replace(pathRegex, replacer);
};

const swcLoader: IJSLoader = async function (content) {
  const callback = this.async();
  // swc will install on demand, so should import dynamic
  const { transform }: typeof import('@swc/core') = require('@swc/core');

  const { alias: oAlias = {} } = this.config;

  const isTSFile = isTs(this.paths.fileAbsPath);
  const isJSXFile = this.paths.fileAbsPath.endsWith('x');

  // transform alias to relative path for swc paths
  const alias = getSWCAlias({
    fileAbsPath: this.paths.fileAbsPath,
    alias: oAlias,
    cwd: this.paths.cwd
  });

  const result = await transform(content, {
    cwd: this.paths.cwd,
    filename: this.paths.fileAbsPath,
    sourceFileName: this.config.sourcemap
      ? winPath(
          path.relative(
            path.dirname(this.paths.itemDistAbsPath),
            this.paths.fileAbsPath
          )
        )
      : undefined,
    sourceMaps: this.config.sourcemap,
    env: {
      targets: this.config.targets
    },

    jsc: {
      baseUrl: this.paths.cwd,
      paths: alias,
      parser: {
        syntax: isTSFile ? 'typescript' : 'ecmascript',
        ...(isTSFile && isJSXFile ? { tsx: true } : {}),
        ...(!isTSFile && isJSXFile ? { jsx: true } : {})
      }
    },
    module: {
      type: this.config.format === 'esm' ? 'es6' : this.config.format
    }
  });
  let { code } = result;
  const { map } = result;
  if (process.platform === 'win32') {
    code = replaceAbsPathWithRelativePath({
      content: code,
      cwd: this.paths.cwd,
      fileAbsPath: this.paths.fileAbsPath
    });
  }

  this.setOutputOptions({
    declaration: true,
    ext: '.js'
  });

  if (map) {
    return callback(
      null,
      addSourceMappingUrl(code!, this.paths.itemDistAbsPath)
    );
  }

  return callback(null, code!);
};

export default swcLoader;

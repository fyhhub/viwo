import { transform } from '@babel/core';
import { winPath } from '@umijs/utils';
import path from 'path';
import { IJSLoader } from '../types';
import {
  addSourceMappingUrl,
  ensureRelativePath,
  getBundlessTargets
} from '../utils';

/**
 * parse for stringify define value, use to babel-plugin-transform-define
 */
function getParsedDefine(define: Record<string, string>) {
  return Object.entries(define).reduce<typeof define>(
    (result, [name, value]) => ({
      ...result,
      [name]: JSON.parse(value)
    }),
    {}
  );
}

/**
 * babel transformer
 */
const babelTransformer: IJSLoader = function (content) {
  const {
    babelPlugins = [],
    babelPresets = [],
    define,
    alias: oAlias = {},
    vue
  } = this.config;
  const presetOpts: any = {
    presetEnv: {
      targets: getBundlessTargets(this.config),
      modules: this.config.format === 'esm' ? false : 'auto'
    },
    presetTypeScript: {},
    presetReact: false
  };

  // transform alias to relative path for babel-plugin-module-resolver
  const alias = Object.entries(oAlias).reduce<typeof oAlias>(
    (result, [name, target]) => {
      if (path.isAbsolute(target)) {
        result[name] = winPath(path.relative(this.paths.cwd, target));
        result[name] = ensureRelativePath(result[name]);
      } else {
        result[name] = target;
      }

      return result;
    },
    {}
  );

  if (this.pkg.dependencies?.['@babel/runtime']) {
    presetOpts.pluginTransformRuntime = {
      absoluteRuntime: false,
      // still use legacy esm helpers, to avoid double imports of runtime helpers
      // from webpack 4 bundlers, such as Umi 3, antd-tools & etc.
      useESModules: this.config.format === 'esm' ? true : false,
      version: this.pkg.dependencies?.['@babel/runtime']
    };
  }

  const { code, map } = transform(content, {
    filename: this.paths.fileAbsPath,
    cwd: this.paths.cwd,
    babelrc: false,
    configFile: false,
    sourceMaps: this.config.sourcemap,
    sourceFileName: this.config.sourcemap
      ? path.relative(
          path.dirname(this.paths.itemDistAbsPath),
          this.paths.fileAbsPath
        )
      : undefined,
    presets: [
      [require.resolve('@umijs/babel-preset-umi'), presetOpts],
      vue === 2.7
        ? [
            require.resolve('@vue/babel-preset-jsx'),
            {
              compositionAPI: 'native'
            }
          ]
        : undefined,
      ...babelPresets
    ].filter(Boolean),
    plugins: [
      [
        require.resolve('babel-plugin-module-resolver'),
        {
          alias: alias,
          cwd: this.paths.cwd,
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.json']
        }
      ],
      vue === 3
        ? [
            '@vue/babel-plugin-jsx',
            {
              enableObjectSlots: false
            }
          ]
        : undefined,
      ...(define
        ? [
            [
              require.resolve('babel-plugin-transform-define'),
              getParsedDefine(define)
            ]
          ]
        : []),
      ...babelPlugins
    ].filter(Boolean)
  })!;

  if (map) {
    this.setOutputOptions({
      ext: '.js',
      declaration: true,
      map: JSON.stringify(map)
    });
    return this.callback(
      null,
      addSourceMappingUrl(code!, this.paths.itemDistAbsPath),
      JSON.stringify(map)
    );
  }

  this.setOutputOptions({
    ext: '.js',
    declaration: true
  });
  return this.callback(null, code!);
};

export default babelTransformer;

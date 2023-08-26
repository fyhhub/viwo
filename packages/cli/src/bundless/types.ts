import type { ExtendedLoaderContext } from 'loader-runner';
export type Transformer = 'esbuild' | 'swc' | 'babel';
export type Format = 'esm' | 'cjs';

type SourceMap = string | null | undefined;
export interface ILoaderContext {
  /**
   * final bundless config
   */
  config: ViwoBundlessConfig;
  /**
   * project package.json
   */
  pkg: Record<string, any>;
}

export type IBundlessLoader = (
  this: Omit<ExtendedLoaderContext, 'async'> &
    ILoaderContext & {
      cwd: string;

      itemDistAbsPath: string;

      /**
       * configure output options for current file
       */
      setOutputOptions: (options: ILoaderOutput['options']) => void;

      /**
       * complete async method type
       */
      async: () => (
        err: Error | null,
        result?: ILoaderOutput['content']
      ) => void;
    },
  content: string
) => ILoaderOutput['content'] | void;

export interface ILoaderOutput {
  content: string;
  options: {
    ext?: string;
    declaration?: boolean;
    map?: SourceMap;
  };
}

export interface ViwoBundlessConfig {
  format: 'esm' | 'commonjs';
  /**
   * 输入文件, 需要传入相对路径
   */
  input?: string;

  /**
   * 输出目录, 需要传入相对路径
   */
  output: string;

  /**
   * 转换器
   */
  transformer?: Transformer;

  /**
   * 忽略文件或目录，支持glob写法
   */
  ignores?: string[];

  /**
   * 定义全局值
   */
  define?: Record<string, string>;

  /**
   * 路径别名
   */
  alias?: Record<string, string>;

  /**
   * sourcemap 配置
   */
  sourcemap?: boolean;

  /**
   * targets 配置, 参考swc targets配置
   */
  targets?: any;

  esbuildPlugins?: any[];

  babelPlugins?: any[];

  watch?: boolean;

  root?: string;
}

export type Transformer = 'esbuild' | 'swc' | 'babel';
export type Format = 'esm' | 'cjs';

export interface ViwoBundlessConfig {
  format: 'esm' | 'cjs';
  /**
   * 输入文件
   */
  input?: string;

  /**
   * 输出目录
   */
  output?: string;

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
   * targets 配置
   */
  targets?: Record<string, number>;

  esbuildPlugins?: any[];

  babelPlugins?: any[];
}

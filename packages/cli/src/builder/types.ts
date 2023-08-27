import type { ExtendedLoaderContext } from 'loader-runner';
import { ViwoBundlessConfig } from '../bundless/types';

type SourceMap = string | null | undefined;

export interface ILoaderOutput {
  content: string;
  options: {
    ext?: string;
    declaration?: boolean;
    map?: SourceMap;
  };
}

export interface ILoaderContext {
  /**
   * final bundless config
   */
  config: ViwoBundlessConfig;
  /**
   * project package.json
   */
  pkg: Record<string, any>;

  callback: (...args: any[]) => void;

  async: () => (err: Error | null, result?: ILoaderOutput['content']) => void;
}

/**
 * normal loader type (base on webpack loader)
 */
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

/**
 * bundless transformer type
 */
export type IJSLoader = (
  this: ILoaderContext & {
    paths: {
      cwd: string;
      fileAbsPath: string;
      itemDistAbsPath: string;
    };
    setOutputOptions: (optps: ILoaderOutput['options']) => void;
  },
  content: Parameters<IBundlessLoader>[0]
) => Promise<void> | string | void;

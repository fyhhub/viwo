import debug from 'debug';

export type DebugScope = `zeus:${string}`;
export function createDebugger(namespace: DebugScope): debug.Debugger['log'] {
  const log = debug(namespace);
  return (msg: string, ...args: any[]) => {
    log(msg, ...args);
  };
}

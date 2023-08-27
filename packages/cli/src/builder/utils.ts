import path from 'path';
import { ViwoBundlessConfig } from '../bundless/types';

export enum IJSTransformerTypes {
  BABEL = 'babel',
  ESBUILD = 'esbuild',
  SWC = 'swc'
}

export enum IPlatformTypes {
  NODE = 'node',
  BROWSER = 'browser'
}
const defaultCompileTarget: Record<
  IPlatformTypes,
  Record<IJSTransformerTypes, any>
> = {
  [IPlatformTypes.BROWSER]: {
    [IJSTransformerTypes.BABEL]: { ie: 11 },
    [IJSTransformerTypes.ESBUILD]: ['chrome51'],
    [IJSTransformerTypes.SWC]: { ie: 11 }
  },
  [IPlatformTypes.NODE]: {
    [IJSTransformerTypes.BABEL]: { node: 14 },
    [IJSTransformerTypes.ESBUILD]: ['node14'],
    [IJSTransformerTypes.SWC]: { node: 14 }
  }
};

export function addSourceMappingUrl(code: string, loc: string) {
  return (
    code +
    '\n//# sourceMappingURL=' +
    path.basename(loc.replace(/\.(jsx|tsx?)$/, '.js.map'))
  );
}
export function ensureRelativePath(relativePath: string) {
  // prefix . for same-level path
  if (!relativePath.startsWith('.')) {
    relativePath = `./${relativePath}`;
  }
  return relativePath;
}

export function getBundlessTargets(config: ViwoBundlessConfig) {
  const { platform, transformer, targets } = config;

  // targets is undefined or empty, fallback to default
  if (!targets || !Object.keys(targets).length) {
    return defaultCompileTarget[platform!][transformer!];
  }
  // esbuild accept string or string[]
  if (transformer === IJSTransformerTypes.ESBUILD) {
    return Object.keys(targets).map(name => `${name}${targets![name]}`);
  }

  return targets;
}

import { addLoader } from '../bundless/loaders/index';
import { ViwoBundlessConfig } from '../bundless/types';

export function initialLoaders(opts: ViwoBundlessConfig) {
  if (opts.transformer === 'babel') {
    addLoader({
      id: 'babel',
      test: /\.(t|j)sx?$/,
      loader: require.resolve('./common/babel')
    });
  }

  if (opts.transformer === 'swc') {
    addLoader({
      id: 'swc',
      test: /\.(t|j)s$/,
      loader: require.resolve('./common/swc')
    });

    addLoader({
      id: 'babel',
      test: /\.(t|j)sx$/,
      loader: require.resolve('./common/babel')
    });
  }

  addLoader({
    id: 'less',
    test: /\.less$/,
    loader: require.resolve('./common/less')
  });
}

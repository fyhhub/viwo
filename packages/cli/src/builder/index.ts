import { addLoader } from '../bundless/loaders/index';
console.log(require.resolve('./common/swc'));

addLoader({
  id: 'swc',
  test: /\.(t|j)sx?$/,
  loader: require.resolve('./common/swc')
});

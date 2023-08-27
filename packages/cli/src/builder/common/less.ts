import { IJSLoader } from '../types';
import less from 'less';
// import path from 'path';
const lessLoader: IJSLoader = async function (content) {
  const callback = this.async();
  const { css } = await less.render(content);
  this.setOutputOptions({
    ext: '.css'
  });
  callback(null, css);
};
export default lessLoader;

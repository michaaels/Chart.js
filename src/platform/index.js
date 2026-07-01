import {_isDomSupported} from '../helpers/index.js';
import BasePlatform from './platform.base.js';
import BasicPlatform from './platform.basic.js';
import DomPlatform from './platform.dom.js';
import WebGLPlatform from './platform.webgl.js';

export function _detectPlatform(canvas) {
  if (!_isDomSupported() || (typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas)) {
    return BasicPlatform;
  }
  return DomPlatform;
}

export {BasePlatform, BasicPlatform, DomPlatform, WebGLPlatform};

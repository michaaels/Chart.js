/**
 * Experimental Chart.Platform implementation that keeps Chart.js' Canvas 2D
 * rendering pipeline intact while presenting completed frames through WebGL.
 */

import {color, isPatternOrGradient} from '../helpers/helpers.color.js';
import {_isPointInArea} from '../helpers/helpers.canvas.js';
import DomPlatform, {initCanvas} from './platform.dom.js';

const WEBGL_EXPANDO_KEY = '$chartjsWebGL';
const POINT_ACCELERATION_THRESHOLD = 1000;
const TEXTURE_VERTEX_SHADER = 'attribute vec2 aPosition; attribute vec2 aTexCoord; varying vec2 vTexCoord; void main(void) { gl_Position = vec4(aPosition, 0.0, 1.0); vTexCoord = aTexCoord; }';
const TEXTURE_FRAGMENT_SHADER = 'precision mediump float; uniform sampler2D uTexture; varying vec2 vTexCoord; void main(void) { gl_FragColor = texture2D(uTexture, vTexCoord); }';
const POINT_VERTEX_SHADER = 'precision mediump float; attribute vec2 aPosition; uniform vec2 uResolution; uniform float uDevicePixelRatio; uniform float uPointSize; void main(void) { vec2 zeroToOne = aPosition / uResolution; vec2 clipSpace = zeroToOne * 2.0 - 1.0; gl_Position = vec4(clipSpace.x, -clipSpace.y, 0.0, 1.0); gl_PointSize = uPointSize * uDevicePixelRatio; }';
const POINT_FRAGMENT_SHADER = 'precision mediump float; uniform vec4 uBackgroundColor; uniform vec4 uBorderColor; uniform float uRadius; uniform float uBorderWidth; uniform float uPointSize; uniform float uDevicePixelRatio; void main(void) { vec2 pixel = (gl_PointCoord - vec2(0.5)) * uPointSize; float distanceFromCenter = length(pixel); float outerRadius = uRadius + uBorderWidth * 0.5; float innerRadius = max(uRadius - uBorderWidth * 0.5, 0.0); float antialias = max(1.0 / uDevicePixelRatio, 0.5); if (distanceFromCenter > outerRadius) { discard; } float alpha = 1.0 - smoothstep(outerRadius - antialias, outerRadius, distanceFromCenter); vec4 pointColor = distanceFromCenter > innerRadius ? uBorderColor : uBackgroundColor; gl_FragColor = vec4(pointColor.rgb, pointColor.a * alpha); }';
const VERTICES = new Float32Array([
  -1, -1, 0, 1,
  1, -1, 1, 1,
  -1, 1, 0, 0,
  1, 1, 1, 0
]);

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    return shader;
  }
  gl.deleteShader(shader);
}

function createProgram(gl, vertexSource, fragmentSource) {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = vertexShader && fragmentShader && gl.createProgram();

  if (!program) {
    return;
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
    return program;
  }

  gl.deleteProgram(program);
}

function createBackingCanvas(canvas) {
  let backingCanvas;

  if (typeof document !== 'undefined' && document.createElement) {
    backingCanvas = document.createElement('canvas');
  } else if (typeof OffscreenCanvas !== 'undefined') {
    backingCanvas = new OffscreenCanvas(canvas.width, canvas.height);
  }

  if (backingCanvas) {
    backingCanvas.width = canvas.width;
    backingCanvas.height = canvas.height;
  }

  return backingCanvas;
}

function createTexture(gl) {
  const texture = gl.createTexture();

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  return texture;
}

function createTextureProgram(gl) {
  const program = createProgram(gl, TEXTURE_VERTEX_SHADER, TEXTURE_FRAGMENT_SHADER);

  if (!program) {
    return;
  }

  const buffer = gl.createBuffer();
  const position = gl.getAttribLocation(program, 'aPosition');
  const texCoord = gl.getAttribLocation(program, 'aTexCoord');

  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, VERTICES, gl.STATIC_DRAW);

  return {
    buffer,
    position,
    program,
    texCoord,
    uniformTexture: gl.getUniformLocation(program, 'uTexture')
  };
}

function createPointProgram(gl) {
  const program = createProgram(gl, POINT_VERTEX_SHADER, POINT_FRAGMENT_SHADER);

  if (!program) {
    return;
  }

  return {
    buffer: gl.createBuffer(),
    position: gl.getAttribLocation(program, 'aPosition'),
    program,
    backgroundColor: gl.getUniformLocation(program, 'uBackgroundColor'),
    borderColor: gl.getUniformLocation(program, 'uBorderColor'),
    borderWidth: gl.getUniformLocation(program, 'uBorderWidth'),
    devicePixelRatio: gl.getUniformLocation(program, 'uDevicePixelRatio'),
    pointSize: gl.getUniformLocation(program, 'uPointSize'),
    radius: gl.getUniformLocation(program, 'uRadius'),
    resolution: gl.getUniformLocation(program, 'uResolution')
  };
}

function createWebGLRenderer(canvas) {
  const attributes = {alpha: true, antialias: false, premultipliedAlpha: false};
  const gl = canvas.getContext('webgl', attributes)
    || canvas.getContext('experimental-webgl', attributes);
  const textureProgram = gl && createTextureProgram(gl);

  if (!textureProgram) {
    return;
  }

  return {
    baseTexture: createTexture(gl),
    gl,
    overlayTexture: createTexture(gl),
    pointProgram: createPointProgram(gl),
    texture: createTexture(gl),
    textureProgram
  };
}

function createContextProxy(context, canvas) {
  return new Proxy(context, {
    get(target, prop) {
      if (prop === 'canvas') {
        return canvas;
      }
      const value = target[prop];
      return typeof value === 'function' ? value.bind(target) : value;
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    }
  });
}

function resizeBackingCanvas(backingCanvas, canvas) {
  let resized = false;
  if (backingCanvas.width !== canvas.width) {
    backingCanvas.width = canvas.width;
    resized = true;
  }
  if (backingCanvas.height !== canvas.height) {
    backingCanvas.height = canvas.height;
    resized = true;
  }
  return resized;
}

function clearBackingCanvas(state) {
  const {backingCanvas, context} = state;

  context.save();
  context.resetTransform();
  context.clearRect(0, 0, backingCanvas.width, backingCanvas.height);
  context.restore();
}

function uploadTexture(renderer, texture, source) {
  const {gl} = renderer;

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
}

function setBlend(gl, enabled) {
  if (enabled) {
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  } else {
    gl.disable(gl.BLEND);
  }
}

function drawTexture(renderer, texture, blend) {
  const {gl, textureProgram} = renderer;

  setBlend(gl, blend);
  gl.useProgram(textureProgram.program);
  gl.bindBuffer(gl.ARRAY_BUFFER, textureProgram.buffer);
  gl.enableVertexAttribArray(textureProgram.position);
  gl.vertexAttribPointer(textureProgram.position, 2, gl.FLOAT, false, 16, 0);
  gl.enableVertexAttribArray(textureProgram.texCoord);
  gl.vertexAttribPointer(textureProgram.texCoord, 2, gl.FLOAT, false, 16, 8);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.uniform1i(textureProgram.uniformTexture, 0);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function toColorArray(value) {
  if (isPatternOrGradient(value)) {
    return;
  }

  const parsed = /** @type {{rgb?: {r: number, g: number, b: number, a: number}}} */ (color(/** @type {any} */ (value)));
  const rgb = parsed && parsed.rgb;

  if (!rgb) {
    return;
  }

  return [rgb.r / 255, rgb.g / 255, rgb.b / 255, rgb.a];
}

function isAcceleratedPointStyle(options) {
  return (!options.pointStyle || options.pointStyle === 'circle')
    && (!options.rotation || options.rotation === 0)
    && Number.isFinite(options.radius)
    && options.radius >= 0.1
    && Number.isFinite(options.borderWidth)
    && toColorArray(options.backgroundColor)
    && toColorArray(options.borderColor);
}

function getDrawRange(meta) {
  const elements = meta.data || [];
  const start = meta.controller._drawStart || 0;
  const count = meta.controller._drawCount || (elements.length - start);
  return {count, start};
}

function hasCompatiblePointOptions(options) {
  return options && isAcceleratedPointStyle(options);
}

function hasSamePointOptions(options, reference) {
  return options
    && options.radius === reference.radius
    && options.borderWidth === reference.borderWidth
    && options.backgroundColor === reference.backgroundColor
    && options.borderColor === reference.borderColor
    && options.pointStyle === reference.pointStyle
    && options.rotation === reference.rotation;
}

function hasSharedPointOptions(elements, start, count, options) {
  for (let i = start; i < start + count; ++i) {
    const element = elements[i];
    if (element && !hasSamePointOptions(element.options, options)) {
      return false;
    }
    if (element && element.active) {
      return false;
    }
  }

  return true;
}

function canAccelerateDataset(meta) {
  const elements = meta.data || [];
  const {count, start} = getDrawRange(meta);
  const first = elements[start];
  const options = first && first.options;

  if (meta.type !== 'scatter' || meta.dataset || count < POINT_ACCELERATION_THRESHOLD || !hasCompatiblePointOptions(options)) {
    return false;
  }

  return hasSharedPointOptions(elements, start, count, options);
}

function canAccelerateChart(chart) {
  const metas = chart.getSortedVisibleDatasetMetas();

  return metas.length > 0 && metas.every(canAccelerateDataset);
}

function buildPointPositions(chart, meta) {
  const elements = meta.data || [];
  const {count, start} = getDrawRange(meta);
  const firstOptions = elements[start].options;
  const positions = [];
  const margin = (firstOptions.radius + firstOptions.borderWidth) / 2;

  for (let i = start; i < start + count; ++i) {
    const element = elements[i];
    if (!element || element.hidden || element.skip || !_isPointInArea(element, chart.chartArea, margin)) {
      continue;
    }
    positions.push(element.x, element.y);
  }

  return new Float32Array(positions);
}

function queueAcceleratedDataset(state, chart, meta) {
  if (!state.gpuFrame) {
    uploadTexture(state.renderer, state.renderer.baseTexture, state.backingCanvas);
    clearBackingCanvas(state);
    state.gpuFrame = {
      datasets: [],
      used: false
    };
  }

  const elements = meta.data || [];
  const options = elements[getDrawRange(meta).start].options;
  const positions = buildPointPositions(chart, meta);

  state.gpuFrame.datasets.push({
    backgroundColor: toColorArray(options.backgroundColor),
    borderColor: toColorArray(options.borderColor),
    borderWidth: options.borderWidth,
    pointSize: (options.radius + options.borderWidth) * 2,
    positions,
    radius: options.radius
  });
}

function drawPointDataset(renderer, chart, dataset) {
  const {gl, pointProgram} = renderer;
  const ratio = chart.currentDevicePixelRatio || 1;

  if (!dataset.positions.length) {
    return;
  }

  gl.useProgram(pointProgram.program);
  gl.bindBuffer(gl.ARRAY_BUFFER, pointProgram.buffer);
  gl.bufferData(gl.ARRAY_BUFFER, dataset.positions, gl.STREAM_DRAW);
  gl.enableVertexAttribArray(pointProgram.position);
  gl.vertexAttribPointer(pointProgram.position, 2, gl.FLOAT, false, 0, 0);
  gl.uniform2f(pointProgram.resolution, chart.width, chart.height);
  gl.uniform1f(pointProgram.devicePixelRatio, ratio);
  gl.uniform1f(pointProgram.pointSize, dataset.pointSize);
  gl.uniform1f(pointProgram.radius, dataset.radius);
  gl.uniform1f(pointProgram.borderWidth, dataset.borderWidth);
  gl.uniform4fv(pointProgram.backgroundColor, dataset.backgroundColor);
  gl.uniform4fv(pointProgram.borderColor, dataset.borderColor);
  setBlend(gl, true);
  gl.drawArrays(gl.POINTS, 0, dataset.positions.length / 2);
}

/**
 * Platform class for charts that render Canvas 2D commands into a hidden
 * backing canvas and copy completed frames to the visible canvas via WebGL.
 *
 * This allows users to opt in with `platform: WebGLPlatform` without changing
 * chart configuration or plugin code that expects a CanvasRenderingContext2D.
 * If WebGL or a backing canvas is not available, it falls back to DomPlatform.
 *
 * @extends DomPlatform
 */
export default class WebGLPlatform extends DomPlatform {
  acquireContext(canvas, aspectRatio) {
    if (!canvas || !canvas.getContext) {
      return super.acquireContext(canvas, aspectRatio);
    }

    initCanvas(canvas, aspectRatio);

    const backingCanvas = createBackingCanvas(canvas);
    const context = backingCanvas && backingCanvas.getContext('2d');
    const renderer = context && createWebGLRenderer(canvas);
    if (!renderer) {
      return super.acquireContext(canvas, aspectRatio);
    }

    const proxy = createContextProxy(context, canvas);
    canvas[WEBGL_EXPANDO_KEY] = {backingCanvas, context, proxy, renderer};
    return proxy;
  }

  releaseContext(context) {
    const canvas = context.canvas;
    const state = canvas && canvas[WEBGL_EXPANDO_KEY];
    if (state) {
      delete canvas[WEBGL_EXPANDO_KEY];
    }
    return super.releaseContext(context);
  }

  prepareFrame(chart) {
    const canvas = chart.canvas;
    const state = canvas && canvas[WEBGL_EXPANDO_KEY];
    if (state) {
      state.gpuFrame = null;
      const resized = resizeBackingCanvas(state.backingCanvas, canvas);
      if (resized) {
        const ratio = chart.currentDevicePixelRatio || 1;
        state.context.setTransform(ratio, 0, 0, ratio, 0, 0);
      }
    }
  }

  renderDataset(chart, meta) {
    const canvas = chart.canvas;
    const state = canvas && canvas[WEBGL_EXPANDO_KEY];

    if (!state || !state.renderer.pointProgram || !canAccelerateChart(chart) || !canAccelerateDataset(meta)) {
      return false;
    }

    queueAcceleratedDataset(state, chart, meta);
    return true;
  }

  renderFrame(chart) {
    const canvas = chart.canvas;
    const state = canvas && canvas[WEBGL_EXPANDO_KEY];
    if (!state) {
      return;
    }

    const {backingCanvas, renderer} = state;
    const {gl} = renderer;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (state.gpuFrame) {
      drawTexture(renderer, renderer.baseTexture, false);
      state.gpuFrame.datasets.forEach(dataset => drawPointDataset(renderer, chart, dataset));
      uploadTexture(renderer, renderer.overlayTexture, backingCanvas);
      drawTexture(renderer, renderer.overlayTexture, true);
      state.gpuFrame.used = state.gpuFrame.datasets.length > 0;
      return;
    }

    uploadTexture(renderer, renderer.texture, backingCanvas);
    drawTexture(renderer, renderer.texture, false);
  }
}

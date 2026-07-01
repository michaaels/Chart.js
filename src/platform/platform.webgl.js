/**
 * Experimental Chart.Platform implementation that keeps Chart.js' Canvas 2D
 * rendering pipeline intact while presenting completed frames through WebGL.
 */

import DomPlatform, {initCanvas} from './platform.dom.js';

const WEBGL_EXPANDO_KEY = '$chartjsWebGL';
const VERTEX_SHADER = 'attribute vec2 aPosition; attribute vec2 aTexCoord; varying vec2 vTexCoord; void main(void) { gl_Position = vec4(aPosition, 0.0, 1.0); vTexCoord = aTexCoord; }';
const FRAGMENT_SHADER = 'precision mediump float; uniform sampler2D uTexture; varying vec2 vTexCoord; void main(void) { gl_FragColor = texture2D(uTexture, vTexCoord); }';
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

function createProgram(gl) {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
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

function createWebGLRenderer(canvas) {
  const gl = canvas.getContext('webgl', {alpha: true, antialias: true, premultipliedAlpha: true})
    || canvas.getContext('experimental-webgl', {alpha: true, antialias: true, premultipliedAlpha: true});
  const program = gl && createProgram(gl);

  if (!program) {
    return;
  }

  const buffer = gl.createBuffer();
  const texture = gl.createTexture();
  const position = gl.getAttribLocation(program, 'aPosition');
  const texCoord = gl.getAttribLocation(program, 'aTexCoord');

  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, VERTICES, gl.STATIC_DRAW);

  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 16, 0);
  gl.enableVertexAttribArray(texCoord);
  gl.vertexAttribPointer(texCoord, 2, gl.FLOAT, false, 16, 8);

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  return {gl, program, buffer, texture};
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
  if (backingCanvas.width !== canvas.width) {
    backingCanvas.width = canvas.width;
  }
  if (backingCanvas.height !== canvas.height) {
    backingCanvas.height = canvas.height;
  }
}

/**
 * Platform class for charts that render Canvas 2D commands into an offscreen
 * backing canvas and copy completed frames to the visible canvas via WebGL.
 *
 * This allows users to opt in with `platform: WebGLPlatform` without changing
 * chart configuration or plugin code that expects a CanvasRenderingContext2D.
 * If WebGL or OffscreenCanvas is not available, it falls back to DomPlatform.
 *
 * @extends DomPlatform
 */
export default class WebGLPlatform extends DomPlatform {
  acquireContext(canvas, aspectRatio) {
    if (!canvas || !canvas.getContext || typeof OffscreenCanvas === 'undefined') {
      return super.acquireContext(canvas, aspectRatio);
    }

    initCanvas(canvas, aspectRatio);

    const backingCanvas = new OffscreenCanvas(canvas.width, canvas.height);
    const context = backingCanvas.getContext('2d');
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
      resizeBackingCanvas(state.backingCanvas, canvas);
    }
  }

  renderFrame(chart) {
    const canvas = chart.canvas;
    const state = canvas && canvas[WEBGL_EXPANDO_KEY];
    if (!state) {
      return;
    }

    const {backingCanvas, renderer} = state;
    const {gl, program, texture} = renderer;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, backingCanvas);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}

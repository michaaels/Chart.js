describe('Platform.webgl', function() {
  const CONTROLLER_TYPES = [
    'bar',
    'bubble',
    'doughnut',
    'line',
    'pie',
    'polarArea',
    'radar',
    'scatter'
  ];

  const charts = [];

  const chartConfigs = {
    bar: () => ({
      type: 'bar',
      data: {
        labels: ['A', 'B', 'C', 'D'],
        datasets: [{
          label: 'Series 1',
          data: [12, 19, 8, 15],
          backgroundColor: 'rgba(255, 99, 132, 0.8)'
        }]
      }
    }),

    bubble: () => ({
      type: 'bubble',
      data: {
        datasets: [{
          label: 'Series 1',
          data: [{x: -8, y: 6, r: 8}, {x: 2, y: 12, r: 12}, {x: 11, y: 4, r: 10}],
          backgroundColor: 'rgba(153, 102, 255, 0.75)'
        }]
      }
    }),

    doughnut: () => ({
      type: 'doughnut',
      data: {
        labels: ['A', 'B', 'C'],
        datasets: [{
          data: [30, 45, 25],
          backgroundColor: ['#ff6384', '#36a2eb', '#ffcd56']
        }]
      }
    }),

    line: () => ({
      type: 'line',
      data: {
        labels: ['A', 'B', 'C', 'D'],
        datasets: [{
          label: 'Series 1',
          data: [4, 12, 7, 14],
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.25)',
          fill: true
        }]
      }
    }),

    pie: () => ({
      type: 'pie',
      data: {
        labels: ['A', 'B', 'C'],
        datasets: [{
          data: [35, 25, 40],
          backgroundColor: ['#4bc0c0', '#9966ff', '#ff9f40']
        }]
      }
    }),

    polarArea: () => ({
      type: 'polarArea',
      data: {
        labels: ['A', 'B', 'C', 'D'],
        datasets: [{
          data: [11, 16, 7, 14],
          backgroundColor: ['#ff6384', '#36a2eb', '#ffcd56', '#4bc0c0']
        }]
      }
    }),

    radar: () => ({
      type: 'radar',
      data: {
        labels: ['A', 'B', 'C', 'D', 'E'],
        datasets: [{
          label: 'Series 1',
          data: [12, 8, 15, 7, 11],
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.3)'
        }]
      }
    }),

    scatter: () => ({
      type: 'scatter',
      data: {
        datasets: [{
          label: 'Series 1',
          data: [{x: -10, y: 0}, {x: 0, y: 10}, {x: 10, y: 5}],
          backgroundColor: 'rgba(255, 159, 64, 0.9)'
        }]
      }
    })
  };

  const scenarioConfigs = [{
    name: 'horizontal stacked bars',
    config: () => ({
      type: 'bar',
      data: {
        labels: ['A', 'B', 'C', 'D'],
        datasets: [{
          label: 'Series 1',
          data: [12, -8, 9, 15],
          backgroundColor: 'rgba(255, 99, 132, 0.75)',
          stack: 'combined'
        }, {
          label: 'Series 2',
          data: [6, 11, -4, 7],
          backgroundColor: 'rgba(54, 162, 235, 0.75)',
          stack: 'combined'
        }]
      },
      options: {
        indexAxis: 'y',
        scales: {
          x: {stacked: true},
          y: {stacked: true}
        }
      }
    })
  }, {
    name: 'floating bars',
    config: () => ({
      type: 'bar',
      data: {
        labels: ['A', 'B', 'C', 'D'],
        datasets: [{
          label: 'Floating',
          data: [[-6, 8], [3, 16], [-10, -2], [6, 18]],
          backgroundColor: 'rgba(75, 192, 192, 0.75)'
        }]
      }
    })
  }, {
    name: 'filled stepped line with skipped values',
    config: () => ({
      type: 'line',
      data: {
        labels: ['A', 'B', 'C', 'D', 'E', 'F'],
        datasets: [{
          label: 'Stepped',
          data: [3, null, 11, 8, NaN, 15],
          borderColor: 'rgba(255, 159, 64, 1)',
          backgroundColor: 'rgba(255, 159, 64, 0.28)',
          fill: 'origin',
          spanGaps: true,
          stepped: 'middle'
        }]
      }
    })
  }, {
    name: 'scatter with parsing disabled',
    config: () => ({
      type: 'scatter',
      data: {
        datasets: [{
          label: 'Raw points',
          data: [{x: -20, y: 5}, {x: -12, y: 8}, {x: 4, y: -3}, {x: 14, y: 11}],
          parsing: false,
          normalized: true,
          pointRadius: 4,
          backgroundColor: 'rgba(153, 102, 255, 0.8)'
        }]
      }
    })
  }, {
    name: 'bubble with scriptable point styling',
    config: () => ({
      type: 'bubble',
      data: {
        datasets: [{
          label: 'Bubbles',
          data: [{x: -14, y: 4, r: 5}, {x: 2, y: 9, r: 12}, {x: 18, y: -6, r: 8}]
        }]
      },
      options: {
        elements: {
          point: {
            backgroundColor(ctx) {
              return ctx.dataIndex % 2 ? 'rgba(54, 162, 235, 0.7)' : 'rgba(255, 99, 132, 0.7)';
            },
            borderWidth: 0
          }
        }
      }
    })
  }, {
    name: 'partial doughnut with offset arcs',
    config: () => ({
      type: 'doughnut',
      data: {
        labels: ['A', 'B', 'C', 'D'],
        datasets: [{
          data: [18, 28, 21, 12],
          backgroundColor: ['#ff6384', '#36a2eb', '#ffcd56', '#4bc0c0'],
          offset: [0, 8, 0, 4],
          spacing: 2
        }]
      },
      options: {
        circumference: 270,
        rotation: -135,
        cutout: '55%'
      }
    })
  }, {
    name: 'pie with arc spacing and hover offsets',
    config: () => ({
      type: 'pie',
      data: {
        labels: ['A', 'B', 'C', 'D'],
        datasets: [{
          data: [12, 19, 7, 10],
          backgroundColor: ['#ff6384', '#36a2eb', '#ffcd56', '#9966ff'],
          hoverOffset: 6,
          spacing: 2
        }]
      }
    })
  }, {
    name: 'polar area with circular grid',
    config: () => ({
      type: 'polarArea',
      data: {
        labels: ['A', 'B', 'C', 'D', 'E'],
        datasets: [{
          data: [9, 14, 7, 12, 5],
          backgroundColor: ['#ff6384', '#36a2eb', '#ffcd56', '#4bc0c0', '#9966ff']
        }]
      },
      options: {
        scales: {
          r: {
            grid: {
              circular: true
            },
            ticks: {
              display: false
            }
          }
        }
      }
    })
  }, {
    name: 'radar with fill and point styles',
    config: () => ({
      type: 'radar',
      data: {
        labels: ['A', 'B', 'C', 'D', 'E', 'F'],
        datasets: [{
          label: 'Radar',
          data: [11, 7, 14, 9, 12, 5],
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.25)',
          pointStyle: ['circle', 'rect', 'triangle', 'star', 'cross', 'dash'],
          fill: true
        }]
      }
    })
  }];

  function mixedChartConfig() {
    return {
      type: 'bar',
      data: {
        labels: ['A', 'B', 'C', 'D'],
        datasets: [{
          type: 'bar',
          label: 'Bars',
          data: [8, 12, 6, 10],
          backgroundColor: 'rgba(255, 99, 132, 0.75)'
        }, {
          type: 'line',
          label: 'Line',
          data: [5, 9, 11, 7],
          borderColor: 'rgba(54, 162, 235, 1)'
        }]
      }
    };
  }

  function denseScatterConfig() {
    const data = [];
    for (let i = 0; i < 12000; i++) {
      data.push({
        x: i % 400,
        y: Math.sin(i / 45) * 35 + (i % 23)
      });
    }

    return {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'Dense scatter',
          data,
          parsing: false,
          normalized: true,
          pointRadius: 1,
          pointBorderWidth: 0,
          backgroundColor: 'rgba(15, 118, 110, 0.35)'
        }]
      },
      options: {
        scales: {
          x: {type: 'linear'},
          y: {type: 'linear'}
        }
      }
    };
  }

  function denseStyledScatterConfig() {
    const config = denseScatterConfig();
    config.data.datasets[0] = {
      ...config.data.datasets[0],
      pointRadius: 3,
      pointStyle: 'rectRot'
    };
    return config;
  }

  function isWebGLAvailable() {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  }

  function createCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    canvas.style.width = '320px';
    canvas.style.height = '240px';
    document.body.appendChild(canvas);
    return canvas;
  }

  function createConfig(config) {
    const options = config.options || {};

    return {
      ...config,
      options: {
        ...options,
        animation: false,
        responsive: false,
        plugins: {
          ...options.plugins,
          legend: false,
          title: false,
          tooltip: false
        }
      },
      platform: Chart.platforms.WebGLPlatform
    };
  }

  function createParityConfig(config, platform) {
    const options = config.options || {};

    return {
      ...config,
      options: {
        ...options,
        animation: false,
        responsive: false
      },
      platform
    };
  }

  function createChart(config, platform) {
    const chartConfig = platform ? createParityConfig(config, platform) : createConfig(config);
    const chart = new Chart(createCanvas(), chartConfig);
    charts.push(chart);
    return chart;
  }

  function destroyChart(chart) {
    const index = charts.indexOf(chart);
    const canvas = chart.canvas;
    if (index !== -1) {
      charts.splice(index, 1);
    }
    chart.destroy();
    canvas.remove();
  }

  function hasRenderedPixels(canvas) {
    const state = canvas.$chartjsWebGL;
    const gl = state && state.renderer.gl;
    if (!gl) {
      return false;
    }

    const pixels = new Uint8Array(canvas.width * canvas.height * 4);
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] !== 0) {
        return true;
      }
    }
    return false;
  }

  function get2dPixels(canvas) {
    return canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  }

  function getWebGLPixels(canvas) {
    const state = canvas.$chartjsWebGL;
    const gl = state.renderer.gl;
    const width = canvas.width;
    const height = canvas.height;
    const pixels = new Uint8Array(width * height * 4);
    const flipped = new Uint8Array(pixels.length);

    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    for (let y = 0; y < height; y++) {
      const source = y * width * 4;
      const target = (height - y - 1) * width * 4;
      flipped.set(pixels.subarray(source, source + width * 4), target);
    }

    return flipped;
  }

  function comparePixels(expected, actual) {
    let mismatches = 0;
    let maxDiff = 0;

    for (let i = 0; i < expected.length; i++) {
      const diff = Math.abs(expected[i] - actual[i]);
      maxDiff = Math.max(maxDiff, diff);
      if (diff > 2) {
        mismatches++;
      }
    }

    return {
      maxDiff,
      mismatchRatio: mismatches / expected.length
    };
  }

  function expectWebGLFrame(chart) {
    const state = chart.canvas.$chartjsWebGL;

    expect(chart.id).toBeDefined();
    expect(chart.canvas).toBeDefined();
    expect(chart.ctx).toBeDefined();
    expect(chart.platform).toBeInstanceOf(Chart.platforms.WebGLPlatform);
    expect(chart.ctx.canvas).toBe(chart.canvas);
    expect(state).toBeDefined();
    expect(state.renderer.gl.constructor.name).toBe('WebGLRenderingContext');
    expect(hasRenderedPixels(chart.canvas)).toBe(true);
  }

  function getRegisteredControllerTypes() {
    return Object.keys(Chart.controllers).sort();
  }

  beforeAll(function() {
    if (!isWebGLAvailable()) {
      pending('WebGLPlatform requires browser WebGL support.');
    }
  });

  afterEach(function() {
    while (charts.length) {
      destroyChart(charts[0]);
    }
  });

  it('has a WebGL test config for every registered chart controller', function() {
    expect(CONTROLLER_TYPES.slice().sort()).toEqual(getRegisteredControllerTypes());
    expect(Object.keys(chartConfigs).sort()).toEqual(CONTROLLER_TYPES.slice().sort());
  });

  CONTROLLER_TYPES.forEach(function(type) {
    it('renders a ' + type + ' chart through WebGLPlatform', function() {
      const chart = createChart(chartConfigs[type]());

      chart.update('none');

      expectWebGLFrame(chart);
      destroyChart(chart);
    });

    it('matches DomPlatform pixels for ' + type + ' chart styles and colors', function() {
      const domChart = createChart(chartConfigs[type](), Chart.platforms.DomPlatform);
      const webglChart = createChart(chartConfigs[type](), Chart.platforms.WebGLPlatform);

      domChart.update('none');
      webglChart.update('none');

      const comparison = comparePixels(get2dPixels(domChart.canvas), getWebGLPixels(webglChart.canvas));
      expect(comparison.maxDiff).toBeLessThan(8);
      expect(comparison.mismatchRatio).toBeLessThan(0.001);
      destroyChart(domChart);
      destroyChart(webglChart);
    });
  });

  scenarioConfigs.forEach(function(scenario) {
    it('renders ' + scenario.name + ' through WebGLPlatform', function() {
      const chart = createChart(scenario.config());

      chart.update('none');

      expectWebGLFrame(chart);
      destroyChart(chart);
    });

    it('matches DomPlatform pixels for ' + scenario.name + ' styles and colors', function() {
      const domChart = createChart(scenario.config(), Chart.platforms.DomPlatform);
      const webglChart = createChart(scenario.config(), Chart.platforms.WebGLPlatform);

      domChart.update('none');
      webglChart.update('none');

      const comparison = comparePixels(get2dPixels(domChart.canvas), getWebGLPixels(webglChart.canvas));
      expect(comparison.maxDiff).toBeLessThan(8);
      expect(comparison.mismatchRatio).toBeLessThan(0.001);
      destroyChart(domChart);
      destroyChart(webglChart);
    });
  });

  it('renders a mixed bar and line chart through WebGLPlatform', function() {
    const chart = createChart(mixedChartConfig());

    chart.update('none');

    expectWebGLFrame(chart);
    expect(chart.getDatasetMeta(0).type).toBe('bar');
    expect(chart.getDatasetMeta(1).type).toBe('line');
    destroyChart(chart);
  });

  it('renders a high-density scatter chart through WebGLPlatform', function() {
    const chart = createChart(denseScatterConfig());

    chart.update('none');

    expectWebGLFrame(chart);
    expect(chart.data.datasets[0].data.length).toBe(12000);
    expect(chart.canvas.$chartjsWebGL.gpuFrame.used).toBe(true);
    expect(chart.canvas.$chartjsWebGL.gpuFrame.datasets[0].positions.length).toBeGreaterThan(0);
    destroyChart(chart);
  });

  it('falls back to Canvas 2D for high-density scatter styles that are not GPU-safe yet', function() {
    const chart = createChart(denseStyledScatterConfig());

    chart.update('none');

    expectWebGLFrame(chart);
    expect(chart.canvas.$chartjsWebGL.gpuFrame).toBe(null);
    destroyChart(chart);
  });

  it('updates and presents subsequent frames through WebGLPlatform', function() {
    const chart = createChart(chartConfigs.scatter());

    expectWebGLFrame(chart);

    chart.data.datasets[0].data = [{x: -6, y: -8}, {x: 3, y: 14}, {x: 12, y: -2}];
    chart.update('none');

    expectWebGLFrame(chart);
    destroyChart(chart);
  });

  it('keeps the backing canvas in sync when resizing', function() {
    const chart = createChart({
      ...chartConfigs.bar(),
      options: {
        devicePixelRatio: 2
      }
    });

    chart.canvas.width = 480;
    chart.canvas.height = 300;
    chart.resize(480, 300);
    chart.update('none');

    const state = chart.canvas.$chartjsWebGL;
    const transform = state.context.getTransform();
    expect(state.backingCanvas.width).toBe(chart.canvas.width);
    expect(state.backingCanvas.height).toBe(chart.canvas.height);
    expect(transform.a).toBe(chart.currentDevicePixelRatio);
    expect(transform.d).toBe(chart.currentDevicePixelRatio);
    expectWebGLFrame(chart);
    destroyChart(chart);
  });

  it('notifies plugins while using a proxied 2d context', function() {
    const hooks = [];
    const chart = createChart({
      ...chartConfigs.line(),
      plugins: [{
        id: 'webgl-platform-hooks',
        beforeDraw(hookChart) {
          hooks.push('beforeDraw');
          expect(hookChart.ctx.canvas).toBe(hookChart.canvas);
        },
        afterDraw(hookChart) {
          hooks.push('afterDraw');
          expect(hookChart.canvas.$chartjsWebGL).toBeDefined();
        }
      }]
    });

    chart.update('none');

    expect(hooks).toEqual(['beforeDraw', 'afterDraw', 'beforeDraw', 'afterDraw']);
    expectWebGLFrame(chart);
    destroyChart(chart);
  });

  it('handles DOM events through WebGLPlatform', async function() {
    let notifiedEvent;
    const chart = createChart({
      ...chartConfigs.bar(),
      plugins: [{
        id: 'webgl-platform-events',
        afterEvent(hookChart, args) {
          expect(hookChart.platform).toBeInstanceOf(Chart.platforms.WebGLPlatform);
          notifiedEvent = args.event;
        }
      }]
    });

    await jasmine.triggerMouseEvent(chart, 'click', {
      x: chart.width / 2,
      y: chart.height / 2
    });

    expect(notifiedEvent).not.toBe(undefined);
    expect(notifiedEvent.type).toBe('click');
    expectWebGLFrame(chart);
    destroyChart(chart);
  });

  it('releases WebGL state when the chart is destroyed', function() {
    const chart = createChart(chartConfigs.line());
    const canvas = chart.canvas;

    expect(canvas.$chartjsWebGL).toBeDefined();

    destroyChart(chart);

    expect(canvas.$chartjsWebGL).not.toBeDefined();
  });
});

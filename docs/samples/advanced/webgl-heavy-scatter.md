# WebGL Heavy Scatter

```js chart-editor
// <block:setup:1>
const DATA_COUNT = 50000;

function createPoints(seed) {
  const points = [];
  let value = seed;

  for (let i = 0; i < DATA_COUNT; i++) {
    value = (value * 16807) % 2147483647;
    const noise = (value / 2147483647 - 0.5) * 24;
    points.push({
      x: i,
      y: Math.sin(i / 120) * 70 + Math.cos(i / 37) * 18 + noise
    });
  }

  return points;
}

const data = {
  datasets: [{
    label: 'GPU scatter dataset',
    data: createPoints(42),
    parsing: false,
    normalized: true,
    pointRadius: 1,
    pointBorderWidth: 0,
    backgroundColor: 'rgba(15, 118, 110, 0.35)'
  }]
};
// </block:setup>

// <block:actions:2>
const actions = [
  {
    name: 'Randomize',
    handler(chart) {
      chart.data.datasets[0].data = createPoints(Math.floor(Math.random() * 100000) + 1);
      chart.update('none');
    }
  }
];
// </block:actions>

// <block:config:0>
const config = {
  type: 'scatter',
  data: data,
  options: {
    animation: false,
    responsive: true,
    interaction: {
      mode: 'nearest',
      intersect: false
    },
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Chart.js WebGL Heavy Scatter'
      }
    },
    scales: {
      x: {
        type: 'linear',
      },
      y: {
        type: 'linear',
      }
    }
  },
};
// </block:config>

module.exports = {
  actions: actions,
  config: config,
};
```

## Docs
* [Scatter](../../charts/scatter.md)
* [Performance](../../general/performance.md)


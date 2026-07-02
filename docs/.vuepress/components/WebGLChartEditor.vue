<template>
  <div class="webgl-chart-editor">
    <div
      v-if="usesWebGL && mountedClient"
      :class="['webgl-badge', webglActive ? 'active' : 'fallback', gpuActive ? 'gpu' : '']"
      aria-live="polite"
    >
      <span class="webgl-badge-icon" aria-hidden="true">GL</span>
      <span>{{ webglStatusLabel }}</span>
    </div>

    <div class="chart-view">
      <canvas ref="canvas" />
    </div>

    <chart-actions
      :actions="actions"
      @action="execute"
    />
    <code-editor
      :error.sync="error"
      :messages="messages"
      :output="output"
      :value="code"
      @input="evaluate"
    />
  </div>
</template>

<script>
import {Chart, WebGLPlatform} from 'chart.js';

import ChartActions from 'vuepress-theme-chartjs/components/ChartActions.vue';
import CodeEditor from 'vuepress-theme-chartjs/components/CodeEditor.vue';

function cloneConfig(config) {
  return {
    ...config,
    data: config.data || {},
    options: config.options || {},
  };
}

export default {
  components: {
    ChartActions,
    CodeEditor,
  },

  props: {
    code: {
      type: String,
      required: true,
    },
  },

  data: () => ({
    actions: null,
    config: null,
    error: null,
    gpuActive: false,
    mountedClient: false,
    messages: [],
    output: false,
    webglActive: false,
  }),

  computed: {
    usesWebGL() {
      return this.$route.path.includes('/samples/');
    },
    webglStatusLabel() {
      if (!this.webglActive) {
        return 'WebGLPlatform fallback';
      }
      return this.gpuActive ? 'WebGLPlatform active + GPU renderer' : 'WebGLPlatform active';
    },
  },

  watch: {
    code(code) {
      this.evaluate(code);
    },
    config: 'updateChart',
  },

  mounted() {
    this.mountedClient = true;
    this.evaluate(this.code);
  },

  beforeDestroy() {
    if (this._chart) {
      this._chart.destroy();
      this._chart = null;
    }
  },

  methods: {
    chart() {
      return this._chart;
    },

    withPlatform(config) {
      const next = cloneConfig(config);
      if (this.usesWebGL) {
        next.platform = WebGLPlatform;
      }
      return next;
    },

    updateWebGLStatus() {
      const canvas = this.$refs.canvas;
      const state = canvas && canvas.$chartjsWebGL;
      this.webglActive = !!(this.usesWebGL && state);
      this.gpuActive = !!(this.webglActive && state.gpuFrame && state.gpuFrame.used);
    },

    updateChart() {
      const config = this.config;
      const canvas = this.$refs.canvas;
      if (!canvas || !config) {
        return;
      }

      if (!this._chart) {
        this._chart = new Chart(canvas, this.withPlatform(config));
      } else {
        this._chart.stop();
        this._chart.data = config.data || {};
        this._chart.options = config.options || {};
        this._chart.update();
      }

      this.$nextTick(this.updateWebGLStatus);
    },

    evaluate(code) {
      this.error = null;

      if (!code) {
        this.config = null;
        return;
      }

      const me = this;
      const logger = {
        log(...args) {
          me.messages = [...me.messages, args.join(' ')].slice(-50);
        },
      };

      const context = {
        ...(this.$chart || {}).imports,
        console: {
          ...console,
          ...logger,
        },
        Chart,
        WebGLPlatform,
      };

      const keys = Object.keys(context);
      const lines = keys.map((key) => {
        return `const ${key} = arguments[0].${key}`;
      });

      const script = `
        'use strict';
        const module = {exports: {}};
        ${lines.join(';\n')};
        (function(){ ${code} })();
        return module.exports;
      `;

      try {
        // eslint-disable-next-line no-new-func
        const exports = new Function(script)(context);
        const config = exports.config || null;
        this.output = exports.output || false;

        if (!this.actions) {
          this.actions = exports.actions || null;
        }

        this.config = Object.freeze(config);
      } catch (error) {
        this.error = error;
      }
    },

    execute(action) {
      action.handler(this.chart());
      this.$nextTick(this.updateWebGLStatus);
    },
  },
};
</script>

<style lang="stylus" scoped>
.chart-view,
.chart-actions
  margin 16px 0

.webgl-badge
  align-items center
  border 1px solid #90c7b8
  border-radius 6px
  color #24594e
  display inline-flex
  font-size 0.85rem
  font-weight 600
  gap 8px
  line-height 1
  margin 12px 0 0
  padding 8px 10px

  &.active
    background #edf9f5

  &.gpu
    background #eef6ff
    border-color #7aa6d9
    color #244b78

  &.fallback
    background #fff8e8
    border-color #e0be6f
    color #775b13

.webgl-badge-icon
  align-items center
  background #24594e
  border-radius 4px
  color #fff
  display inline-flex
  font-size 0.68rem
  height 20px
  justify-content center
  letter-spacing 0
  width 24px

.webgl-badge.fallback .webgl-badge-icon
  background #775b13

.webgl-badge.gpu .webgl-badge-icon
  background #244b78
</style>

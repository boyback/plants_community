const DEFAULT_OPTIONS = {
  pcViewport: 1920,
  h5Viewport: 375,
  precision: 6,
  minPixelValue: 1,
  convertOnePx: false,
  defaultMode: 'pc',
};

const MODE_RE = /px-vw:\s*(pc|h5|off|on)/i;

function round(value, precision) {
  const factor = Math.pow(10, precision);
  return String(Math.round(value * factor) / factor);
}

function viewportForMode(mode, options) {
  if (mode === 'h5') return options.h5Viewport;
  return options.pcViewport;
}

function modeFromFile(file, options) {
  if (!file) return options.defaultMode;
  if (/(^|[./_-])h5([._/-]|$)|mobile/i.test(file)) return 'h5';
  if (/(^|[./_-])pc([._/-]|$)|desktop/i.test(file)) return 'pc';
  return options.defaultMode;
}

function shouldSkipDeclaration(decl) {
  if (!decl.value || decl.value.includes('url(')) return true;
  if (decl.value.includes('var(')) return true;
  return false;
}

function convertPxValue(value, mode, options) {
  if (mode === 'off') return value;
  const viewport = viewportForMode(mode, options);

  return value.replace(/(-?\d*\.?\d+)px\b/g, (match, raw) => {
    const px = Number(raw);
    if (!Number.isFinite(px)) return match;
    const abs = Math.abs(px);
    if (!options.convertOnePx && abs === 1) return match;
    if (abs < options.minPixelValue) return match;
    return `${round((px / viewport) * 100, options.precision)}vw`;
  });
}

function readModeComment(commentText, currentMode, defaultMode) {
  const match = commentText.match(MODE_RE);
  if (!match) return currentMode;
  const next = match[1].toLowerCase();
  return next === 'on' ? defaultMode : next;
}

module.exports = function pxToVwPlugin(userOptions = {}) {
  const options = { ...DEFAULT_OPTIONS, ...userOptions };

  return {
    postcssPlugin: 'rouyou-postcss-px-to-vw',
    Once(root, { result }) {
      let mode = modeFromFile(result.opts.from, options);
      const defaultMode = mode;

      root.walk((node) => {
        if (node.type === 'comment') {
          mode = readModeComment(node.text, mode, defaultMode);
          return;
        }

        if (node.type !== 'decl') return;
        if (shouldSkipDeclaration(node)) return;
        node.value = convertPxValue(node.value, mode, options);
      });
    },
  };
};

module.exports.postcss = true;

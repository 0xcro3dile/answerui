// jsdom has no ResizeObserver, and Radix sliders need one to render.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

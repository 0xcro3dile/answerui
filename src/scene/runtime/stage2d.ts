export const WIDTH = 800;
export const HEIGHT = 450;

/** Scale and offset that fit the 800×450 drawing area inside a frame, centered, keeping its shape. */
export function letterbox(width: number, height: number) {
  const scale = Math.min(width / WIDTH, height / HEIGHT);
  return { scale, x: (width - WIDTH * scale) / 2, y: (height - HEIGHT * scale) / 2 };
}

export function mount2d(title: string) {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", title);
  canvas.style.cssText = "display:block;width:100%;height:100%";
  document.body.append(canvas);
  const ctx = canvas.getContext("2d")!;

  function resize() {
    const ratio = devicePixelRatio;
    canvas.width = innerWidth * ratio;
    canvas.height = innerHeight * ratio;
    const { scale, x, y } = letterbox(innerWidth, innerHeight);
    ctx.setTransform(scale * ratio, 0, 0, scale * ratio, x * ratio, y * ratio);
  }
  resize();
  addEventListener("resize", resize);

  return { globals: { ctx }, render() {} };
}

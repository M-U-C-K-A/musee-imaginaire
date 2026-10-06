/**
 * Loupe: a canvas lying flat, its picture a field of dots with a low sun in
 * it, and a magnifying glass held above it. The glass follows the pointer on
 * a spring; through it, the dots beneath come up enlarged and bright. A dashed
 * ring on the canvas marks the patch it reads. At rest the glass sits over the
 * sun. The slider is the magnification.
 *
 * The pattern: a field. Springs, the pointer read on the canvas plane (which
 * never moves), and one highlight: what the glass shows.
 */
const {
  Cam, circ, clamp, facing, fit, hull, open, poly, prism, proj, rings, ringAt, run, unproj, spring, stepS,
  disposer, flatDot, mk, place, pointer, put, register, solid,
} = HL;

const W = 150, D = 106, TOP = 5, STEP = 8, RL = 34, ZL = 24, RIM = 3, SUN = [104, 34], SUN_R = 13;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let zoom = value;
  const C = Cam(45, 0.5, 1.62);
  fit(C, [[-10, -10, -4], [W + 10, -10, -4], [-10, D + 10, -4], [W + 10, D + 10, -4], [W, 0, ZL + 4], [W + RL + 36, D, ZL], [-RL, -RL, ZL + 4]], 200, 166);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);

  // a table plate, and the stretched canvas lying on it
  const [tr, ti] = rings(-10, -10, W + 10, D + 10, 8, 2);
  put(solid(g), prism(P, front, tr, ti, -4, 0));
  const [cr, ci] = rings(0, 0, W, D, 2.4, 1.4);
  put(solid(g), prism(P, front, cr, ci, 0, TOP));

  // the picture: dots, a low sun and a horizon in the medium weight
  const field = [];
  for (let y = STEP / 2 + 3; y < D - 3; y += STEP) for (let x = STEP / 2 + 3; x < W - 3; x += STEP) {
    // a low sun, the horizon, and the sun's track on the water below it
    const sun = Math.hypot(x - SUN[0], y - SUN[1]) < SUN_R, horizon = Math.abs(y - 63) < 3;
    const track = y > 66 && Math.abs(x - SUN[0]) < 6 && Math.round((y - 7) / STEP) % 2 === 0;
    const warm = sun || horizon || track;
    const el = flatDot(g, C, 0.85, warm ? "dot m" : "dot off");
    place(el, P(x, y, TOP));
    field.push({ x, y, warm });
  }

  // the patch the glass reads, dashed on the canvas, then the glass above it
  const guide = mk("path", { class: "nf dash" }, g);
  const glass = solid(g);
  const view = mk("g", {}, g);
  const pool = Array.from({ length: 40 }, () => flatDot(view, C, 1.7, "dot"));
  const inner = mk("path", { class: "nf lo" }, g);
  const handle = solid(g);

  const disc = circ(RL, 28), discIn = circ(RL - RIM, 28);
  const at = (ring, cx, cy, z) => ring.map((q) => P(cx + q.u, cy + q.v, z));
  const sx = spring(SUN[0]), sy = spring(SUN[1]);
  let drawn = "";

  function draw() {
    const cx = sx.x, cy = sy.x, key = `${cx.toFixed(2)},${cy.toFixed(2)},${zoom}`;
    if (key === drawn) return;
    drawn = key;
    guide.setAttribute("d", poly(at(circ((RL - RIM) / zoom, 24), cx, cy, TOP)));
    glass.sil.setAttribute("d", poly(hull(at(disc, cx, cy, ZL).concat(at(disc, cx, cy, ZL + 2.4)))));
    glass.cr.setAttribute("d", open(at(run(disc.map((q) => ({ ...q })), (q) => !front(q)), cx, cy, ZL + 2.4)));
    inner.setAttribute("d", poly(at(discIn, cx, cy, ZL + 2.4)));
    // through the glass: the dots within its reach, spread by the magnification
    const seen = field.filter((d) => Math.hypot(d.x - cx, d.y - cy) * zoom < RL - RIM - 2).slice(0, pool.length);
    view.replaceChildren(...pool.slice(0, seen.length));
    seen.forEach((d, k) => {
      pool[k].setAttribute("class", d.warm ? "dot" : "dot m");
      place(pool[k], P(cx + (d.x - cx) * zoom, cy + (d.y - cy) * zoom, ZL + 2.4));
    });
    const [hr, hi] = rings(cx + RL - 1, cy - 2.6, cx + RL + 32, cy + 2.6, 2.6, 0.8);
    put(handle, prism(P, front, hr, hi, ZL - 0.4, ZL + 2.8));
  }

  const B = register(stage, (dt) => {
    const m = stepS(sx, dt) | stepS(sy, dt);
    draw();
    return Boolean(m);
  });
  bag.add(B.unregister);
  draw();

  function aim(p) {
    if (!p) { sx.t = SUN[0]; sy.t = SUN[1]; read.textContent = "rest"; B.wake(); return; }
    const [x, y] = unproj(C, p[0], p[1], TOP);
    sx.t = clamp(x, 0, W); sy.t = clamp(y, 0, D);
    read.textContent = `${Math.floor(sx.t / STEP)}·${Math.floor(sy.t / STEP)}`;
    B.wake();
  }

  bag.add(pointer(stage, { move: aim, leave: () => aim(null) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { zoom = v; drawn = ""; B.wake(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "loupe",
  means: "A magnifying glass over a canvas. It follows the pointer, and the patch of picture beneath it comes up enlarged.",
  rules: [1, 3, 4, 8],
  range: [1.6, 2.1, 2.7],
  mount,
});

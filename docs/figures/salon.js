/**
 * Salon: a gallery wall hung salon-style, five frames with their cartels, a
 * bench in front. The frame under the pointer steps out of the wall towards
 * the visitor; its neighbours follow a little, staggered outwards from it.
 * At rest the largest frame already stands proud and holds the bright edge.
 * The slider is how far the chosen frame comes out, in world units.
 *
 * The pattern: one of many. Tweens, a stagger by distance, and a hit test on
 * each frame's resting face, which never moves.
 */
const {
  Cam, clamp, facing, fit, hull, open, poly, prism, proj, rings, ringAt, rrect, run,
  tdone, tset, tval, tween, disposer, mk, pointer, put, register, solid,
} = HL;

const L = 176, T = 10, H = 92, D = 3.4, R = 2.2, MAT = 4.2;
// x0, x1, z0, z1 on the wall's face: a salon hang, uneven on purpose
const FR = [[8, 40, 36, 76], [50, 100, 24, 70], [110, 134, 48, 78], [108, 138, 14, 38], [148, 170, 30, 62]];
const REST = [1.4, 7, 2.6, 0.8, 2], HERO = 1, STEP = 45;

/** A frame's ring on the wall plane, standing at depth y: its samples projected. */
const onWall = (P, ring, y) => ring.map((q) => P(q.u, y, q.v));

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let reach = value;
  const C = Cam(45, 0.5, 1.5);
  fit(C, [[-14, -T - 12, -5], [L + 14, -T - 12, -5], [-14, 62, -5], [L + 14, 62, -5], [0, -T, H], [L, -T, H], [50, 34, 70]], 200, 166);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);

  // the room: a floor plate, then the wall standing on it
  const [fr, fi] = rings(-14, -T - 12, L + 14, 62, 10, 2.2);
  put(solid(g), prism(P, front, fr, fi, -5, 0));
  const [wr, wi] = rings(0, -T, L, 0, 3, 1.4);
  put(solid(g), prism(P, front, wr, wi, 0, H));

  // frames and cartels, by ascending x: nearer things are painted later
  const frames = FR.map(([x0, x1, z0, z1], i) => {
    const ring = rrect(x0, z0, x1, z1, R, 4), mat = rrect(x0 + MAT, z0 + MAT, x1 - MAT, z1 - MAT, 0.8, 3);
    const grp = mk("g", {}, g);
    const sil = mk("path", { class: "sil" }, grp), crease = mk("path", { class: "nf lo" }, grp), opening = mk("path", { class: "nf lo" }, grp);
    const cartel = mk("path", {}, g);
    cartel.setAttribute("d", poly(onWall(P, rrect(x1 + 1.6, z0, x1 + 7, z0 + 3.6, 0.8, 3), 0.7)));
    // the resting face, for the hit test: it never moves (rule 01)
    const face = hull(onWall(P, ring, REST[i] + D));
    return { ring, mat, sil, crease, opening, face, tw: tween(REST[i]), drawn: NaN };
  });

  // a bench in front of the wall: two legs, then the seat
  for (const x of [62, 112]) { const [r, n] = rings(x, 40, x + 6, 48, 1.4, 0.6); put(solid(g), prism(P, front, r, n, 0, 10)); }
  const [sr, si] = rings(56, 38, 124, 50, 3, 1.2);
  put(solid(g), prism(P, front, sr, si, 10, 13.5));

  const keepTopRight = (q) => q.nu > 0.25 || q.nv > 0.25;
  function draw(f, y) {
    if (y === f.drawn) return;
    f.drawn = y;
    const back = onWall(P, f.ring, y), fore = onWall(P, f.ring, y + D);
    f.sil.setAttribute("d", poly(hull(back.concat(fore))));
    f.crease.setAttribute("d", open(onWall(P, run(f.ring, keepTopRight), y + D)));
    f.opening.setAttribute("d", poly(onWall(P, f.mat, y + D)));
  }

  /** Point in a convex screen polygon, either winding. */
  function inside(poly2, [x, y]) {
    let s = 0;
    for (let k = 0; k < poly2.length; k++) {
      const [ax, ay] = poly2[k], [bx, by] = poly2[(k + 1) % poly2.length];
      const c = Math.sign((bx - ax) * (y - ay) - (by - ay) * (x - ax));
      if (c && s && c !== s) return false;
      if (c) s = c;
    }
    return true;
  }
  const hit = (p) => frames.findIndex((f) => inside(f.face, p));

  const B = register(stage, (_dt, now) => {
    let moving = false;
    for (const f of frames) { draw(f, tval(f.tw, now)); if (!tdone(f.tw, now)) moving = true; }
    return moving;
  });
  bag.add(B.unregister);

  let act = -2;
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act >= 0 ? act : HERO;
    act = a;
    frames.forEach((f, i) => {
      const d = Math.abs(i - from);
      const y = a < 0 ? REST[i] : i === a ? reach : clamp(reach * 0.22 * (1 - d / 3), 0, reach);
      tset(f.tw, y, now, d * STEP);
      f.sil.classList.toggle("hi", a < 0 ? i === HERO : i === a);
    });
    read.textContent = a < 0 ? "rest" : `œuvre ${a + 1}`;
    B.wake();
  }
  setActive(-1);

  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { reach = v; if (act >= 0) { const a = act; act = -2; setActive(a); } },
    destroy: bag.dispose,
  };
}

hairline({
  name: "salon",
  means: "A gallery wall hung frame to frame. The one under the pointer steps out towards the visitor.",
  rules: [1, 2, 4, 5],
  range: [12, 22, 32],
  mount,
});

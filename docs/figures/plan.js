/**
 * Plan: the museum's seven rooms on a plinth, laid out as a U round a
 * courtyard. Each room is an open tray whose walls stand at their own height;
 * its number is a row of dots on its floor. The room under the pointer raises
 * its walls; the rooms next to it on the visit rise less, staggered outwards.
 * At rest room I holds the bright edge: where the visit begins. The slider is
 * how high the chosen room's walls go.
 *
 * The pattern: one of many, on the ground. Tweens, a stagger by distance along
 * the visit, and a hit test on the floor plane, which never moves.
 */
const {
  Cam, clamp, facing, fit, hull, open, poly, prism, proj, rings, ringAt, rrect, run, unproj,
  tdone, tset, tval, tween, disposer, flatDot, mk, place, pointer, put, register, solid,
} = HL;

// footprints in visit order: I to VII
const ROOMS = [[0, 0, 48, 40], [52, 0, 96, 40], [100, 0, 156, 40], [100, 44, 156, 80], [100, 84, 156, 124], [52, 84, 96, 124], [0, 84, 48, 124]];
const REST = [13, 9, 15, 10, 16, 8, 11], WT = 2.4, WR = 3, STEP = 45;

/** One room's paths at wall height h: far half (under the dots) and near half (over them). */
function tray(P, front, outer, inner, h) {
  const LR = (pts) => (pts[0][0] <= pts[pts.length - 1][0] ? pts : pts.slice().reverse());
  const iF = LR(ringAt(P, run(inner, front), h)), oT = LR(ringAt(P, run(outer, front), h)), oB = LR(ringAt(P, run(outer, front), 0));
  return {
    body: poly(hull(ringAt(P, outer, 0).concat(ringAt(P, outer, h)))),
    rim: poly(ringAt(P, inner, h)),
    seam: open(ringAt(P, run(inner, (q) => !front(q)), 0.4)),
    nearFill: poly([...iF, oT[oT.length - 1], ...oB.slice().reverse(), oT[0]]),
    nearTop: open(oT),
    nearIn: open(iF),
    nearOut: open([oT[0], ...oB, oT[oT.length - 1]]),
  };
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let high = value;
  const C = Cam(45, 0.5, 1.5);
  fit(C, [[-8, -8, -5], [164, -8, -5], [-8, 132, -5], [164, 132, -5], [0, 0, 40], [156, 0, 40], [0, 124, 40]], 200, 166);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);

  const [pr, pi] = rings(-8, -8, 164, 132, 9, 2.2);
  put(solid(g), prism(P, front, pr, pi, -5, 0));

  // rooms painted back to front: by the sum of their centre's coordinates
  const rooms = ROOMS.map(([x0, y0, x1, y1], i) => ({ i, x0, y0, x1, y1, c: (x0 + x1) / 2 + (y0 + y1) / 2 }));
  for (const r of [...rooms].sort((a, b) => a.c - b.c)) {
    r.outer = rrect(r.x0, r.y0, r.x1, r.y1, WR, 5);
    r.inner = rrect(r.x0 + WT, r.y0 + WT, r.x1 - WT, r.y1 - WT, WR - WT * 0.5, 5);
    const grp = mk("g", {}, g);
    r.body = mk("path", { class: "sil" }, grp);
    r.rim = mk("path", { class: "nf" }, grp);
    r.seam = mk("path", { class: "nf lo" }, grp);
    // the room's number, as dots in a row on its floor
    const cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2, n = r.i + 1;
    r.dots = [];
    for (let k = 0; k < n; k++) {
      const el = flatDot(grp, C, 1.1, "dot off");
      place(el, P(cx + (k - (n - 1) / 2) * 4.6, cy, 0));
      r.dots.push(el);
    }
    r.nearFill = mk("path", { class: "fo" }, grp);
    r.nearTop = mk("path", { class: "nf lo" }, grp);
    r.nearIn = mk("path", { class: "nf" }, grp);
    r.nearOut = mk("path", { class: "nf sil" }, grp);
    r.tw = tween(REST[r.i]);
    r.drawn = NaN;
  }

  function draw(r, h) {
    if (h === r.drawn) return;
    r.drawn = h;
    const t = tray(P, front, r.outer, r.inner, h);
    r.body.setAttribute("d", t.body); r.rim.setAttribute("d", t.rim); r.seam.setAttribute("d", t.seam);
    r.nearFill.setAttribute("d", t.nearFill); r.nearTop.setAttribute("d", t.nearTop);
    r.nearIn.setAttribute("d", t.nearIn); r.nearOut.setAttribute("d", t.nearOut);
  }

  // the floor never moves: the pointer is read on it (rule 01)
  const hit = ([sx, sy]) => {
    const [x, y] = unproj(C, sx, sy, 0);
    return rooms.findIndex((r) => x >= r.x0 - 2 && x <= r.x1 + 2 && y >= r.y0 - 2 && y <= r.y1 + 2);
  };

  const B = register(stage, (_dt, now) => {
    let moving = false;
    for (const r of rooms) { draw(r, tval(r.tw, now)); if (!tdone(r.tw, now)) moving = true; }
    return moving;
  });
  bag.add(B.unregister);

  const NUM = ["I", "II", "III", "IV", "V", "VI", "VII"];
  let act = -2;
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act >= 0 ? act : 0;
    act = a;
    for (const r of rooms) {
      const d = Math.abs(r.i - from), share = d === 0 ? 1 : d === 1 ? 0.5 : d === 2 ? 0.28 : 0;
      const h = a < 0 ? REST[r.i] : Math.max(REST[r.i] * 0.6, clamp(high * share, 0, high));
      tset(r.tw, h, now, d * STEP);
      const on = a < 0 ? r.i === 0 : r.i === a;
      r.body.classList.toggle("hi", on); r.nearOut.classList.toggle("hi", on);
      r.dots.forEach((el) => el.setAttribute("class", on ? "dot" : "dot off"));
    }
    read.textContent = a < 0 ? "rest" : `salle ${NUM[a]}`;
    B.wake();
  }
  setActive(-1);

  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { high = v; if (act >= 0) { const a = act; act = -2; setActive(a); } },
    destroy: bag.dispose,
  };
}

hairline({
  name: "plan",
  means: "Seven rooms round a courtyard. The room under the pointer raises its walls, and the next rooms on the visit follow.",
  rules: [1, 2, 5, 10],
  range: [20, 30, 40],
  mount,
});

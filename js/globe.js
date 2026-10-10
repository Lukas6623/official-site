/* =========================================================
   SERVERGUARD — PROTECTED NETWORK GLOBE
   Pure canvas, no dependencies. Needs js/land-data.js first.
========================================================= */
(() => {
    const canvas = document.getElementById("globe");
    if (!canvas || !window.SG_LAND) return;

    const ctx = canvas.getContext("2d");
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const TAU = Math.PI * 2;

    /* ---------- DATA ---------- */
    const SERVERS = {
        fra: { name: "Frankfurt",     lat: 50.11, lon: 8.68 },
        nyc: { name: "New York",      lat: 40.71, lon: -74.0 },
        sgp: { name: "Singapore",     lat: 1.35,  lon: 103.8 },
        gru: { name: "São Paulo",     lat: -23.55, lon: -46.63 },
        tyo: { name: "Tokyo",         lat: 35.68, lon: 139.69 },
        syd: { name: "Sydney",        lat: -33.87, lon: 151.2 }
    };
    const USERS = {
        kyiv: { lat: 50.45, lon: 30.52 },
        lon:  { lat: 51.5,  lon: -0.12 },
        sf:   { lat: 37.77, lon: -122.4 },
        tor:  { lat: 43.65, lon: -79.38 },
        bom:  { lat: 19.07, lon: 72.88 },
        cpt:  { lat: -33.92, lon: 18.42 },
        sel:  { lat: 37.56, lon: 126.97 },
        bog:  { lat: 4.71,  lon: -74.07 },
        akl:  { lat: -36.85, lon: 174.76 }
    };
    // user -> server secure tunnels
    const LINKS = [
        ["kyiv", "fra"], ["lon", "fra"], ["sf", "nyc"], ["tor", "nyc"],
        ["bom", "sgp"],  ["cpt", "fra"], ["sel", "tyo"], ["bog", "gru"],
        ["akl", "syd"],  ["sf", "tyo"],  ["lon", "nyc"]
    ];
    // anonymous hostile origins
    const HOSTILE = [
        { lat: 56, lon: 60 }, { lat: 31, lon: 112 }, { lat: 12, lon: 8 },
        { lat: -5, lon: -60 }, { lat: 45, lon: -100 }, { lat: 24, lon: 54 }
    ];

    /* ---------- MATH ---------- */
    const rad = d => d * Math.PI / 180;
    const toVec = ({ lat, lon }) => {
        const la = rad(lat), lo = rad(lon);
        return [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)];
    };
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    function makeArc(a, b, n = 64) {
        const dot = clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1);
        const om = Math.acos(dot), so = Math.sin(om) || 1e-6;
        const pts = new Float32Array((n + 1) * 3);
        for (let i = 0; i <= n; i++) {
            const t = i / n;
            const k1 = Math.sin((1 - t) * om) / so, k2 = Math.sin(t * om) / so;
            const h = 1 + (0.03 + 0.34 * om / Math.PI) * Math.sin(Math.PI * t);
            pts[i * 3]     = (k1 * a[0] + k2 * b[0]) * h;
            pts[i * 3 + 1] = (k1 * a[1] + k2 * b[1]) * h;
            pts[i * 3 + 2] = (k1 * a[2] + k2 * b[2]) * h;
        }
        return pts;
    }

    /* ---------- LAND DOTS ---------- */
    const L = window.SG_LAND;
    const bin = atob(L.data);
    const mask = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) mask[i] = bin.charCodeAt(i);
    const isLand = (lat, lon) => {
        const x = Math.min(L.w - 1, Math.floor(lon + 180));
        const y = Math.min(L.h - 1, Math.floor(90 - lat));
        return (mask[y * (L.w / 8) + (x >> 3)] >> (7 - (x & 7))) & 1;
    };
    const landPts = [], seaPts = [];
    (function build(n) {
        const ga = Math.PI * (3 - Math.sqrt(5));
        for (let i = 0; i < n; i++) {
            const y = 1 - 2 * (i + .5) / n, r = Math.sqrt(1 - y * y), t = ga * i;
            const x = Math.cos(t) * r, z = Math.sin(t) * r;
            const lat = Math.asin(y) * 180 / Math.PI, lon = Math.atan2(x, z) * 180 / Math.PI;
            (isLand(lat, lon) ? landPts : seaPts).push(x, y, z);
        }
    })(15000);
    const LAND = new Float32Array(landPts);
    const SEA = new Float32Array(seaPts.filter((_, i) => Math.floor(i / 3) % 3 === 0 ? true : false));

    // graticule
    const grat = [];
    for (let lo = -180; lo < 180; lo += 30) {
        const line = [];
        for (let la = -90; la <= 90; la += 6) line.push(toVec({ lat: la, lon: lo }));
        grat.push(line);
    }
    for (let la = -60; la <= 60; la += 30) {
        const line = [];
        for (let lo = -180; lo <= 180; lo += 6) line.push(toVec({ lat: la, lon: lo }));
        grat.push(line);
    }

    /* ---------- NODES / LINKS ---------- */
    Object.values(SERVERS).forEach((s, i) => { s.v = toVec(s); s.ph = i * .17; s.flash = 0; });
    Object.values(USERS).forEach((u, i) => { u.v = toVec(u); u.ph = i * .11; });
    HOSTILE.forEach(h => { h.v = toVec(h); });

    const links = LINKS.map(([u, s], i) => ({
        user: USERS[u], server: SERVERS[s],
        arc: makeArc(USERS[u].v, SERVERS[s].v),
        speed: .00011 + (i % 4) * .00002,
        ph: i * .19,
        dir: i % 2 ? 1 : -1
    }));

    let attacks = [], bursts = [], rings = [];
    let blockedTotal = 1284;

    /* ---------- STATE ---------- */
    let W, H, R, cx, cy, dpr;
    let yaw = rad(20), tilt = .38;
    let dragging = false, lastX = 0, lastY = 0, velYaw = 0;
    let running = false, last = 0, nextAttack = 900;
    let cyw, syw, ct, st;
    const out = [0, 0, 0];

    function resize() {
        const r = canvas.getBoundingClientRect();
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = r.width; H = r.height;
        canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cx = W / 2; cy = H / 2; R = Math.min(W, H) * .30;
        if (!running) draw(performance.now());
    }

    function rot(x, y, z) {
        const x1 = x * cyw - z * syw, z1 = x * syw + z * cyw;
        out[0] = x1; out[1] = y * ct - z1 * st; out[2] = y * st + z1 * ct;
        return out;
    }
    const visible = o => o[2] > 0 || (o[0] * o[0] + o[1] * o[1]) > 1;

    /* ---------- DRAW HELPERS ---------- */
    function drawDots(arr, buckets, size) {
        const nb = buckets.length, groups = buckets.map(() => new Path2D());
        for (let i = 0; i < arr.length; i += 3) {
            const o = rot(arr[i], arr[i + 1], arr[i + 2]);
            if (o[2] <= 0) continue;
            const b = Math.min(nb - 1, Math.floor(o[2] * nb));
            groups[b].rect(cx + o[0] * R - size / 2, cy - o[1] * R - size / 2, size, size);
        }
        for (let b = 0; b < nb; b++) { ctx.fillStyle = buckets[b]; ctx.fill(groups[b]); }
    }

    function screenArc(pts) {
        const n = pts.length / 3, sp = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
            const o = rot(pts[i * 3], pts[i * 3 + 1], pts[i * 3 + 2]);
            sp[i * 3] = cx + o[0] * R; sp[i * 3 + 1] = cy - o[1] * R;
            sp[i * 3 + 2] = visible(o) ? 1 : 0;
        }
        return sp;
    }

    function strokeArc(sp, from, to, color, width, alpha) {
        ctx.strokeStyle = color; ctx.lineWidth = width; ctx.globalAlpha = alpha;
        ctx.beginPath();
        let pen = false;
        for (let i = from; i <= to; i++) {
            if (!sp[i * 3 + 2]) { pen = false; continue; }
            pen ? ctx.lineTo(sp[i * 3], sp[i * 3 + 1]) : ctx.moveTo(sp[i * 3], sp[i * 3 + 1]);
            pen = true;
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    // travelling glowing pulse along an arc; t in 0..1 (tail follows head)
    function pulse(sp, t, color, tail = .2, hot = "#ffffff") {
        const n = sp.length / 3 - 1;
        const head = Math.floor(clamp(t, 0, 1) * n);
        const from = Math.max(0, Math.floor((t - tail) * n));
        ctx.lineCap = "round";
        for (let i = from; i < head; i++) {
            if (!sp[i * 3 + 2] || !sp[(i + 1) * 3 + 2]) continue;
            const k = (i - from) / Math.max(1, head - from);
            ctx.strokeStyle = color; ctx.globalAlpha = k * .95; ctx.lineWidth = .6 + k * 2.2;
            ctx.beginPath(); ctx.moveTo(sp[i * 3], sp[i * 3 + 1]); ctx.lineTo(sp[(i + 1) * 3], sp[(i + 1) * 3 + 1]); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        if (sp[head * 3 + 2]) {
            const x = sp[head * 3], y = sp[head * 3 + 1];
            const g = ctx.createRadialGradient(x, y, 0, x, y, 11);
            g.addColorStop(0, color); g.addColorStop(1, "transparent");
            ctx.globalAlpha = .55; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 11, 0, TAU); ctx.fill();
            ctx.globalAlpha = 1; ctx.fillStyle = hot; ctx.beginPath(); ctx.arc(x, y, 1.9, 0, TAU); ctx.fill();
        }
    }

    function project(v) {
        const o = rot(v[0], v[1], v[2]);
        return { x: cx + o[0] * R, y: cy - o[1] * R, z: o[2] };
    }

    function glowDot(x, y, r, rgb, a) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.2);
        g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(.35, `rgba(${rgb},${a * .3})`); g.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 3.2, 0, TAU); ctx.fill();
        ctx.fillStyle = `rgb(${rgb})`; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }

    /* ---------- MAIN DRAW ---------- */
    function draw(now) {
        cyw = Math.cos(yaw); syw = Math.sin(yaw); ct = Math.cos(tilt); st = Math.sin(tilt);
        ctx.clearRect(0, 0, W, H);

        // atmosphere
        let g = ctx.createRadialGradient(cx, cy, R * .92, cx, cy, R * 1.55);
        g.addColorStop(0, "rgba(90,140,255,.34)"); g.addColorStop(.25, "rgba(80,110,255,.12)"); g.addColorStop(1, "rgba(60,90,255,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.55, 0, TAU); ctx.fill();

        // sphere body
        g = ctx.createRadialGradient(cx - R * .35, cy - R * .4, R * .1, cx, cy, R);
        g.addColorStop(0, "#182848"); g.addColorStop(.6, "#0b1222"); g.addColorStop(1, "#070a13");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();

        // graticule
        ctx.lineWidth = .6; ctx.strokeStyle = "rgba(120,160,255,.09)";
        ctx.beginPath();
        for (const line of grat) {
            let pen = false;
            for (const v of line) {
                const o = rot(v[0], v[1], v[2]);
                if (o[2] <= 0) { pen = false; continue; }
                const x = cx + o[0] * R, y = cy - o[1] * R;
                pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y); pen = true;
            }
        }
        ctx.stroke();

        // dots
        drawDots(SEA, ["rgba(90,125,210,.10)", "rgba(90,125,210,.14)", "rgba(90,125,210,.18)"], 1.2);
        drawDots(LAND, ["rgba(110,150,255,.30)", "rgba(120,165,255,.55)", "rgba(140,182,255,.80)", "rgba(190,215,255,.98)"], 1.9);

        // fresnel rim
        g = ctx.createRadialGradient(cx, cy, R * .78, cx, cy, R);
        g.addColorStop(0, "rgba(90,140,255,0)"); g.addColorStop(1, "rgba(110,160,255,.28)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
        ctx.strokeStyle = "rgba(150,190,255,.38)"; ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();

        // secure tunnels
        for (const l of links) {
            l.sp = screenArc(l.arc);
            strokeArc(l.sp, 0, 64, "#6f9eff", 1, .2);
            let t = ((now * l.speed + l.ph) % 1);
            if (l.dir < 0) t = 1 - t;
            pulse(l.sp, t, l.dir > 0 ? "#7ea9ff" : "#58d68d", .16);
        }

        // hostile attempts, stopped by the shield
        for (const a of attacks) {
            const t = clamp((now - a.t0) / a.dur, 0, 1);
            a.sp = screenArc(a.arc);
            strokeArc(a.sp, 0, 64, "#ff6b6b", .8, .12 * (1 - t));
            pulse(a.sp, ease(t) * 1, "#ff5d5d", .22, "#ffd0d0");
            const hp = project(a.from.v);
            if (hp.z > 0) glowDot(hp.x, hp.y, 2, "255,93,93", .8);
        }

        // nodes: users
        for (const u of Object.values(USERS)) {
            const p = project(u.v);
            if (p.z <= 0) continue;
            const k = .5 + .5 * p.z;
            const ph = ((now / 1600) + u.ph) % 1;
            ctx.strokeStyle = `rgba(88,214,141,${(1 - ph) * .5 * k})`; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(p.x, p.y, 3 + ph * 11, 0, TAU); ctx.stroke();
            glowDot(p.x, p.y, 2.3 * k + .4, "88,214,141", .9 * k);
        }

        // nodes: servers with shield ring
        ctx.font = "600 10px SFMono-Regular, Consolas, monospace";
        ctx.textBaseline = "middle";
        for (const s of Object.values(SERVERS)) {
            const p = project(s.v);
            if (p.z <= 0) continue;
            const k = .55 + .45 * p.z;
            const ph = ((now / 1900) + s.ph) % 1;
            s.flash *= .94;
            const shieldR = 9 + s.flash * 5;
            ctx.strokeStyle = `rgba(126,169,255,${(.35 + s.flash * .6) * k})`; ctx.lineWidth = 1 + s.flash;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = -Math.PI / 2 + i * TAU / 6;
                const x = p.x + Math.cos(a) * shieldR, y = p.y + Math.sin(a) * shieldR;
                i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
            }
            ctx.closePath(); ctx.stroke();
            if (s.flash > .05) { ctx.fillStyle = `rgba(126,169,255,${s.flash * .18})`; ctx.fill(); }
            ctx.strokeStyle = `rgba(126,169,255,${(1 - ph) * .45 * k})`; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(p.x, p.y, 8 + ph * 18, 0, TAU); ctx.stroke();
            glowDot(p.x, p.y, 3 * k + .5, "126,169,255", k);
            if (p.z > .25) {
                ctx.fillStyle = `rgba(205,220,255,${clamp((p.z - .25) * 1.6, 0, .9)})`;
                ctx.textAlign = "left";
                ctx.fillText(s.name.toUpperCase(), p.x + 15, p.y - 1);
            }
        }

        // impacts
        for (const r of rings) {
            const age = (now - r.t0) / 900;
            if (age >= 1) continue;
            const p = project(r.v);
            if (p.z <= 0) continue;
            ctx.strokeStyle = `rgba(126,190,255,${(1 - age) * .9})`; ctx.lineWidth = 2 * (1 - age) + .5;
            ctx.beginPath(); ctx.arc(p.x, p.y, 8 + age * 34, 0, TAU); ctx.stroke();
        }
        for (const b of bursts) {
            const age = (now - b.t0) / 800;
            if (age >= 1) continue;
            const p = project(b.v);
            if (p.z <= 0) continue;
            ctx.fillStyle = `rgba(255,110,110,${1 - age})`;
            for (const q of b.parts) {
                ctx.beginPath();
                ctx.arc(p.x + Math.cos(q.a) * q.s * age * 30, p.y + Math.sin(q.a) * q.s * age * 30, 1.6 * (1 - age) + .3, 0, TAU);
                ctx.fill();
            }
        }
    }

    /* ---------- EVENTS / FEED ---------- */
    const feed = document.getElementById("feed");
    const elBlocked = document.getElementById("stat-blocked");
    const elTunnels = document.getElementById("stat-tunnels");
    const elNodes = document.getElementById("stat-nodes");
    if (elTunnels) elTunnels.textContent = links.length;
    if (elNodes) elNodes.textContent = Object.keys(SERVERS).length + Object.keys(USERS).length;
    if (elBlocked) elBlocked.textContent = blockedTotal.toLocaleString("en-US");

    const rnd = n => Math.floor(Math.random() * n);
    const OCT = [185, 45, 91, 103, 194, 62, 178, 141];
    const stamp = () => new Date().toTimeString().slice(0, 8);

    function pushFeed(kind, tag, text) {
        if (!feed) return;
        const li = document.createElement("li");
        li.className = kind;
        li.innerHTML = `<b>${tag}</b><span>${text}</span><time>${stamp()}</time>`;
        feed.prepend(li);
        while (feed.children.length > 4) feed.lastChild.remove();
    }

    function spawnAttack(now) {
        const srv = Object.values(SERVERS)[rnd(6)];
        const from = HOSTILE[rnd(HOSTILE.length)];
        attacks.push({ from, server: srv, arc: makeArc(from.v, srv.v), t0: now, dur: 2300 + rnd(900), done: false });
    }

    function tickEvents(now) {
        for (const a of attacks) {
            if (!a.done && now - a.t0 >= a.dur) {
                a.done = true;
                a.server.flash = 1;
                rings.push({ v: a.server.v, t0: now });
                bursts.push({ v: a.server.v, t0: now, parts: Array.from({ length: 12 }, (_, i) => ({ a: i * TAU / 12 + Math.random() * .4, s: .5 + Math.random() * .8 })) });
                blockedTotal++;
                if (elBlocked) elBlocked.textContent = blockedTotal.toLocaleString("en-US");
                pushFeed("block", "BLOCKED", `${OCT[rnd(OCT.length)]}.xxx.xxx.xxx → ${a.server.name}`);
            }
        }
        attacks = attacks.filter(a => now - a.t0 < a.dur + 400);
        rings = rings.filter(r => now - r.t0 < 900);
        bursts = bursts.filter(b => now - b.t0 < 800);
        if (now > nextAttack) { spawnAttack(now); nextAttack = now + 1700 + rnd(1400); }
        if (Math.random() < .004) {
            const l = links[rnd(links.length)];
            pushFeed("ok", "SECURE", `Tunnel established → ${l.server.name}`);
        }
    }

    /* ---------- LOOP ---------- */
    function frame(now) {
        if (!running) return;
        const dt = Math.min(50, now - (last || now)); last = now;
        if (!dragging) {
            velYaw *= .95;
            yaw += velYaw + (reduceMotion ? 0 : .00011 * dt);
        }
        if (!reduceMotion) tickEvents(now);
        draw(now);
        requestAnimationFrame(frame);
    }

    function start() { if (running) return; running = true; last = 0; requestAnimationFrame(frame); }
    function stop() { running = false; }

    /* ---------- INTERACTION ---------- */
    canvas.addEventListener("pointerdown", e => {
        dragging = true; lastX = e.clientX; lastY = e.clientY; velYaw = 0;
        canvas.setPointerCapture(e.pointerId); canvas.classList.add("dragging");
    });
    canvas.addEventListener("pointermove", e => {
        if (!dragging) return;
        const dx = e.clientX - lastX, dy = e.clientY - lastY;
        lastX = e.clientX; lastY = e.clientY;
        yaw -= dx * .0065; velYaw = -dx * .0004;
        tilt = clamp(tilt + dy * .004, -.7, .9);
        if (!running) draw(performance.now());
    });
    const release = () => { dragging = false; canvas.classList.remove("dragging"); };
    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", release);

    let inView = false;
    const sync = () => (inView && !document.hidden ? start() : stop());
    new IntersectionObserver(([en]) => { inView = en.isIntersecting; sync(); }, { threshold: .05 }).observe(canvas);
    document.addEventListener("visibilitychange", sync);
    new ResizeObserver(resize).observe(canvas);
    resize();
})();

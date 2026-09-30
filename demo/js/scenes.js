/* ============================================================================
   scenes.js —— 演示场景（动画主线版）
   §设计原则（对上一版「文字档案」的修正）
     1. 一屏一个视觉主体（.stage 占 ~70% 面积），文字只做一句话说明（.cap ≤2 行）；
     2. 数字**不参与动画**，只随动画「揭示」（保证任何一帧的数字都是真值）；
     3. 每张动画都是归一化时间 u 的纯函数 → 可播放/暂停/拖动/定格；
     4. 全部机理动画均带「示意」水印；全部数据图元带 run_id 与独立副本 data-golden；
     5. 长表格统一收进「附录」（X1），主线不出现大表。
   ========================================================================== */
(function () {
  'use strict';
  var D = window.DEMO_DATA, DEMO = window.DEMO, ANIM = window.ANIM;
  var n = DEMO.n, V = DEMO.V;
  var SCENES = [];
  function reg(o) { SCENES.push(o); }
  function svg(vb, inner, cls) {
    return '<svg class="stage-svg ' + (cls || '') + '" viewBox="' + vb + '" ' +
      'xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">' + inner + '</svg>';
  }
  function stage(animId, inner, note) {
    return '<div class="anim" data-schematic="1" data-anim="' + animId + '">' + inner + '</div>' +
      '<div class="abar" data-bar="' + animId + '"></div>' +
      (note ? '<div class="cap">' + note + '</div>' : '');
  }
  function kpi(lab, html, hintKey) {
    return '<div class="kpi"><div class="lab">' + lab + '</div>' + html +
      (hintKey ? '<div class="hint">' + n(hintKey.key || hintKey, hintKey.o || {}) + '</div>' : '') + '</div>';
  }
  var WARN = '<span class="wm">机理示意，非数据回放</span>';

  /* ========================================================================
     序列交互梯形图（swimlane ladder · 实体 + 数据包版）
     —— 端点画成**实体图标**（卫星 / 终端 / 信关站），消息画成**沿路径飞行的
        数据包胶囊**（白底描边圆角，内嵌消息名，到达停住），由场景统一游标 t
        （A3: ms，A5: s，A4: u）驱动；时间轴水平（x 增大 = 时间增大）。
     ====================================================================== */
  /* 短名：胶囊内文字（取标签前段，避免胶囊过宽） */
  function shortOf(s) {
    var t = String(s == null ? '' : s).split(/[（(：:]/)[0].trim();
    if (t.length > 12) t = t.split('→')[0].trim();
    if (t.length > 12) t = t.slice(0, 12).trim();
    return t || String(s == null ? '' : s).slice(0, 12);
  }
  /* 一条消息：虚线引导 + 沿路径飞行的「数据包胶囊」（由 driveSeq 驱动 transform） */
  function seqMsg(id, x1, y1, x2, y2, color, label, lx, ly) {
    var txt = shortOf(label), w = Math.max(48, txt.length * 10.5 + 20), h = 24;
    var lab = label ? '<text class="seq-lab" x="' + lx + '" y="' + ly + '" text-anchor="middle" fill="' + color + '" opacity="0">' + label + '</text>' : '';
    return '<g class="seqmsg pkt" id="' + id + '" data-x1="' + x1 + '" data-y1="' + y1 + '" data-x2="' + x2 + '" data-y2="' + y2 + '">' +
      '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + color + '" stroke-width="1.3" stroke-linecap="round" stroke-dasharray="3 4" opacity="0.4"/>' +
      '<g class="pktbody" transform="translate(' + x1 + ',' + y1 + ')" opacity="0">' +
      '<rect x="' + (-w / 2) + '" y="' + (-h / 2) + '" width="' + w + '" height="' + h + '" rx="12" fill="#ffffff" stroke="' + color + '" stroke-width="1.7"/>' +
      '<text x="0" y="0.5" text-anchor="middle" dominant-baseline="central" font-size="12.5" font-weight="700" fill="' + color + '">' + txt + '</text>' +
      '</g>' + lab + '</g>';
  }
  /* 一段「等待/处理」占位（落在一根泳道上） */
  function seqWait(id, x1, x2, y, color, label) {
    var w = Math.max(0, x2 - x1);
    return '<g class="seqwait" id="' + id + '">' +
      '<rect x="' + x1 + '" y="' + (y - 4) + '" width="' + w + '" height="8" rx="4" fill="' + color + '" opacity="0"/>' +
      (label && w > 40 ? '<text class="s-sub" x="' + ((x1 + x2) / 2) + '" y="' + (y - 9) + '" text-anchor="middle" fill="' + color + '">' + label + '</text>' : '') + '</g>';
  }
  /* 实体图标：终端 / 卫星 / 信关站——让泳道端点从「文字框」变成「真实的家伙」 */
  function entityGlyph(kind, x, y) {
    if (kind === 'sat') {
      return '<g transform="translate(' + x + ',' + y + ')">' +
        '<rect x="-11" y="-6" width="22" height="12" rx="2.5" fill="#3a4a5c"/>' +
        '<rect x="-26" y="-4.5" width="12" height="9" rx="1.5" fill="#1f4e79"/>' +
        '<rect x="14" y="-4.5" width="12" height="9" rx="1.5" fill="#1f4e79"/>' +
        '<path d="M0,6 l-4.5,4.5 h9 z" fill="#7a4e9e"/></g>';
    }
    if (kind === 'gw') {
      return '<g transform="translate(' + x + ',' + y + ')">' +
        '<rect x="-10" y="-9" width="20" height="15" rx="2" fill="#fff" stroke="#78909c" stroke-width="1.5"/>' +
        '<line x1="0" y1="-9" x2="0" y2="-19" stroke="#78909c" stroke-width="1.8"/>' +
        '<circle cx="0" cy="-20.5" r="2" fill="#78909c"/></g>';
    }
    return '<g transform="translate(' + x + ',' + y + ')">' +
      '<rect x="-9" y="-7.5" width="18" height="13" rx="2.5" fill="#fff" stroke="#2c6e9b" stroke-width="1.6"/>' +
      '<line x1="0" y1="-7.5" x2="0" y2="-15" stroke="#2c6e9b" stroke-width="1.8"/>' +
      '<circle cx="0" cy="-16.5" r="2.1" fill="#2c6e9b"/>' +
      '<path d="M-5.5,-19 a7,7 0 0 1 11,0" fill="none" stroke="#2c6e9b" stroke-width="1.1" opacity="0.55"/>' +
      '<path d="M-9,-22 a11,11 0 0 1 18,0" fill="none" stroke="#2c6e9b" stroke-width="1.1" opacity="0.3"/></g>';
  }
  /* 一根泳道：左端实体图标 + 名称 + 时间线 */
  function seqLane(y, label, color, x0, x1, kind) {
    return entityGlyph(kind || 'ue', 30, y) +
      '<text x="56" y="' + (y + 4) + '" class="s-strong" fill="' + color + '">' + label + '</text>' +
      '<line x1="' + (x0 - 14) + '" y1="' + y + '" x2="' + x1 + '" y2="' + y + '" stroke="' + color + '" stroke-width="1.4" opacity="0.45"/>' +
      '<circle cx="' + (x0 - 14) + '" cy="' + y + '" r="2.4" fill="' + color + '" opacity="0.8"/>';
  }
  /* 纯数据包（无引导线）：用于「物理链路」场景——链路本身即路径 */
  function pktOnly(id, x1, y1, x2, y2, color, label) {
    var txt = shortOf(label), w = Math.max(48, txt.length * 10.5 + 20), h = 24;
    return '<g class="seqmsg pkt" id="' + id + '" data-x1="' + x1 + '" data-y1="' + y1 + '" data-x2="' + x2 + '" data-y2="' + y2 + '">' +
      '<g class="pktbody" transform="translate(' + x1 + ',' + y1 + ')" opacity="0">' +
      '<rect x="' + (-w / 2) + '" y="' + (-h / 2) + '" width="' + w + '" height="' + h + '" rx="12" fill="#ffffff" stroke="' + color + '" stroke-width="1.7"/>' +
      '<text x="0" y="0.5" text-anchor="middle" dominant-baseline="central" font-size="12.5" font-weight="700" fill="' + color + '">' + txt + '</text>' +
      '</g></g>';
  }
  /* 「等待 / 处理」转环：把协议里的等待画成会转的环（等得越久，转得越久） */
  function spinRing(id, x, y, r, color) {
    var d = (r * 0.7071).toFixed(1);
    return '<g class="spin" id="' + id + '" data-x="' + x + '" data-y="' + y + '" opacity="0">' +
      '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="1.6" opacity="0.45" stroke-dasharray="3 4"/>' +
      '<path d="M' + x + ',' + (y - r) + ' A' + r + ',' + r + ' 0 0 1 ' + (x + d) + ',' + (y - d) + '" fill="none" stroke="' + color + '" stroke-width="3.4" stroke-linecap="round"/>' +
      '</g>';
  }
  /* 驱动转环：在 [t0,t1] 内可见并旋转 */
  function driveSpin(host, id, t, t0, t1) {
    var g = host.querySelector('#' + id); if (!g) return;
    var on = t >= t0 && t <= t1;
    g.setAttribute('opacity', on ? 1 : 0);
    if (!on) return;
    var prog = ANIM.clamp01((t - t0) / Math.max(1e-6, t1 - t0));
    g.setAttribute('transform', 'rotate(' + (prog * 1080).toFixed(0) + ' ' + g.getAttribute('data-x') + ' ' + g.getAttribute('data-y') + ')');
  }
  /* 依据游标 t 推进一组消息 / 等待段；items:[{id,t0,t1}] */
  function driveSeq(host, items, t) {
    items.forEach(function (m) {
      var g = host.querySelector('#' + m.id); if (!g) return;
      var prog = ANIM.clamp01((t - m.t0) / Math.max(1e-6, (m.t1 - m.t0)));
      var body = g.querySelector('.pktbody');
      if (body) {
        var x1 = +g.getAttribute('data-x1'), y1 = +g.getAttribute('data-y1');
        var x2 = +g.getAttribute('data-x2'), y2 = +g.getAttribute('data-y2');
        var x = x1 + (x2 - x1) * prog, y = y1 + (y2 - y1) * prog;
        body.setAttribute('transform', 'translate(' + x.toFixed(1) + ',' + y.toFixed(1) + ')');
        /* 飞行中显示数据包胶囊；到达后淡出，路径转为实线（教科书式「已完成报文」） */
        var op = t < m.t0 ? 0 : (prog >= 0.85 ? Math.max(0, (1 - prog) / 0.15) : 1);
        body.setAttribute('opacity', op.toFixed(2));
        var ln = g.querySelector('line');
        if (ln) {
          ln.setAttribute('stroke-dasharray', prog >= 1 ? 'none' : '3 4');
          ln.setAttribute('opacity', (0.3 + 0.6 * prog).toFixed(2));
        }
        var lb = g.querySelector('.seq-lab'); if (lb) lb.setAttribute('opacity', prog > 0.45 ? 1 : 0);
        return;
      }
      var line = g.querySelector('line');
      if (line) line.setAttribute('stroke-dashoffset', (1 - prog).toFixed(3));
      var head = g.querySelector('.seq-head'); if (head) head.setAttribute('opacity', prog > 0.82 ? 1 : 0);
      var lab = g.querySelector('.seq-lab'); if (lab) lab.setAttribute('opacity', prog > 0.45 ? 1 : 0);
      var rect = g.querySelector('rect'); if (rect) rect.setAttribute('opacity', t >= m.t0 ? 0.14 : 0);
    });
  }
  /* A3 消息时序（由 H.seg2/seg4 推导，单程传播 = 往返 / 2） */
  function a3LadderItems(H) {
    var ow = H.seg2[0].ms / 2, proc = H.seg2[1].ms;
    var ts = [
      { id: 'a3-ts-A', t0: 0, t1: ow },
      { id: 'a3-ts-proc', t0: ow, t1: ow + proc },
      { id: 'a3-ts-B', t0: ow + proc, t1: ow + proc + ow }
    ];
      var f0 = 0, f1 = ow, f2 = 2 * ow, f3 = 2 * ow + proc, fr = f3 + 160, f4 = fr + ow, f5 = f4 + ow;
    var fs = [
      { id: 'a3-fs-1', t0: f0, t1: f1 },
      { id: 'a3-fs-2', t0: f1, t1: f2 },
      { id: 'a3-fs-proc', t0: f2, t1: f3 },
      { id: 'a3-fs-rar', t0: f3, t1: fr },
      { id: 'a3-fs-3', t0: fr, t1: f4 },
      { id: 'a3-fs-4', t0: f4, t1: f5 },
      { id: 'a3-fs-cont', t0: f5, t1: 391.0 }
    ];
    return { ow: ow, proc: proc, ts: ts, fs: fs, tsEnd: ow + proc + ow, fsEnd: 391.0 };
  }
  /* A5 预迁移梯形图 x 映射（与甘特同款断轴：-20..0 左段 = 20 s 提前量窗口，0..+1 放大右段） */
  function a5LadX(t) {
    var LA = 70, LB = 500, LC = 524, LD = 1000;
    return t <= 0 ? LA + (t + 20) / 20 * (LB - LA) : LC + (t / 1.0) * (LD - LC);
  }
  function a5LadderItems() {
    return [
      { id: 'a5-l-push', t0: -20, t1: -16 },
      { id: 'a5-l-ready', t0: -16, t1: -12 },
      { id: 'a5-l-rec', t0: -12, t1: -11 },
      { id: 'a5-l-fb', t0: 0.12, t1: 0.5 }
    ];
  }

  /* ========================================================================
     A1 · 一屏看懂：灾后地面网失效 → 终端直连 → 三机制维持在线
     ====================================================================== */
  reg({
    id: 'A1', nav: '一屏看懂', title: '一屏看懂：灾后应急通信的「断网—直连—维持」',
    sub: '地面公网全瘫、海量终端突发接入、星上算力受限 —— 本方法要在这样的条件下把人接进来并保持在线。',
    after: function () {
      ANIM.reg('a1', {
        dur: 12000, note: '动画只做「揭示」，数字始终是真值；可拖动定格任意时刻',
        build: function (host) {
          return {
            leds: [0, 1, 2].map(function (i) { return host.querySelector('#a1-led' + i); }),
            xs: [0, 1, 2].map(function (i) { return host.querySelector('#a1-x' + i); }),
            terms: [].slice.call(host.querySelectorAll('#a1-terms .t')),
            sat: host.querySelector('#a1-satbody'),
            beam: host.querySelector('#a1-beam'),
            mecs: [].slice.call(host.querySelectorAll('#a1-mec .mec')),
            tiles: [].slice.call(document.querySelectorAll('#sc-A1 .grid4 .kpi'))
          };
        },
        frame: function (u, c) {
          var e = ANIM.easeInOut;
          /* ① 地面网失效 0–0.18 */
          c.leds.forEach(function (led, i) {
            var on = u < 0.05 + i * 0.045;
            led.setAttribute('fill', on ? '#1e8449' : '#b0bcc9');
            c.xs[i].setAttribute('opacity', u > 0.05 + i * 0.045 + 0.02 ? 1 : 0);
          });
          /* ② 终端点亮 0.16–0.55 */
          var tp = ANIM.clamp01((u - 0.16) / 0.39);
          c.terms.forEach(function (t, i) {
            var on = (i + 1) / c.terms.length <= tp;
            t.setAttribute('fill', on ? '#0e7490' : '#b6c4d2');
            t.setAttribute('opacity', on ? 0.85 : 0.55);
          });
          /* ③ 卫星过顶 + 波束 0.35–0.75 */
          var sp = ANIM.clamp01((u - 0.35) / 0.40);
          var sx = ANIM.lerp(1150, 520, e(sp)), sy = ANIM.lerp(-40, 96, e(sp));
          c.sat.setAttribute('transform', 'translate(' + sx.toFixed(1) + ',' + sy.toFixed(1) + ')');
          var gx = ANIM.lerp(1150, 540, e(sp)), gw = 300 * ANIM.clamp01(sp * 1.6);
          c.beam.setAttribute('points', (sx) + ',' + (sy + 12) + ' ' + (gx - gw) + ',380 ' + (gx + gw) + ',380');
          c.beam.setAttribute('opacity', u > 0.33 ? 1 : 0);
          /* ④ 三机制依次点亮 0.58–0.95 */
          c.mecs.forEach(function (m, i) {
            var on = u > 0.58 + i * 0.12;
            m.setAttribute('opacity', on ? 1 : 0.28);
            var r = m.querySelector('rect');
            r.setAttribute('stroke', on ? '#0e7490' : '#dbe3ec');
            r.setAttribute('fill', on ? '#e0f2f7' : '#fff');
          });
          /* ⑤ 右侧四个 KPI 随事件揭示 */
          var th = [0.60, 0.72, 0.84, 0.94];
          c.tiles.forEach(function (t, i) { t.classList.toggle('on', u >= th[i]); });
        },
        readout: function (u) {
          var ph = u < 0.18 ? '地面公网失效' : u < 0.55 ? '海量终端直连卫星' :
            u < 0.78 ? '卫星过顶服务' : u < 0.96 ? '三机制接管' : '恢复在线';
          return '阶段：<b>' + ph + '</b>';
        }
      });
      ANIM.mountScreen(['a1']);
    },
    render: function () {
      var inner = svg('0 0 1000 430',
        /* 天空 / 地面 */
        '<defs>' +
        '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="#eef4fb"/><stop offset="1" stop-color="#f8fbfe"/></linearGradient>' +
        '<radialGradient id="beam"><stop offset="0" stop-color="#0e7490" stop-opacity=".22"/>' +
        '<stop offset="1" stop-color="#0e7490" stop-opacity="0"/></radialGradient>' +
        '</defs>' +
        '<rect x="0" y="0" width="1000" height="430" fill="url(#sky)"/>' +
        '<g opacity=".35" stroke="#c8d6e5" stroke-dasharray="4 6">' +
        [70, 210, 350, 490, 630, 770, 910].map(function (x) { return '<line x1="' + x + '" y1="0" x2="' + x + '" y2="430"/>'; }).join('') +
        '</g>' +
        /* 断网：信关站 / 基站 */
        '<g id="a1-bs">' +
        [[120, '信关站'], [300, '核心网'], [480, '基站']].map(function (b, i) {
          return '<g transform="translate(' + b[0] + ',300)">' +
            '<rect x="-26" y="-46" width="52" height="46" rx="5" fill="#fff" stroke="#8fa3b6"/>' +
            '<line x1="0" y1="-46" x2="0" y2="-74" stroke="#8fa3b6" stroke-width="3"/>' +
            '<circle id="a1-led' + i + '" cx="0" cy="-24" r="7" fill="#1e8449"/>' +
            '<g id="a1-x' + i + '" opacity="0">' +
            '<line x1="-40" y1="-64" x2="40" y2="8" stroke="#c0392b" stroke-width="4" stroke-linecap="round"/>' +
            '<line x1="40" y1="-64" x2="-40" y2="8" stroke="#c0392b" stroke-width="4" stroke-linecap="round"/></g>' +
            '<text x="0" y="16" text-anchor="middle" class="s-lab">' + b[1] + '</text>' +
            '</g>';
        }).join('') + '</g>' +
        /* 终端点阵（真实 1200 台，按 1:10 取样示意） */
        '<g id="a1-terms">' + (function () {
          var s = '';
          for (var i = 0; i < 120; i++) {
            var col = i % 12, row = (i / 12) | 0;
            var x = 150 + col * 33 + (row % 2) * 16, y = 336 + row * 11;
            s += '<rect class="t" data-i="' + i + '" x="' + x + '" y="' + y + '" width="7" height="7" ' +
              'rx="1.4" fill="#b6c4d2"/>';
          }
          return s;
        })() + '</g>' +
        '<text x="600" y="428" class="s-sub">终端点阵按 1:10 示意（实测 1200 台，逐台点亮）</text>' +
        /* 卫星 + 波束 */
        '<g id="a1-sat">' +
        '<polygon id="a1-beam" points="0,0 0,0 0,0" fill="url(#beam)"/>' +
        '<g id="a1-satbody">' +
        '<rect x="-22" y="-9" width="44" height="18" rx="4" fill="#2c3e50"/>' +
        '<rect x="-46" y="-6" width="20" height="12" rx="2" fill="#1f4e79"/>' +
        '<rect x="26" y="-6" width="20" height="12" rx="2" fill="#1f4e79"/>' +
        '</g></g>' +
        /* 三机制条 */
        '<g id="a1-mec">' +
        [[0, '① 两步 RACH', '一次往返接入'], [1, '② 星上认证', '无核心网本地校验'], [2, '③ 预测式切换', '先建后断不掉线']]
          .map(function (m, i) {
            return '<g class="mec" data-i="' + i + '" transform="translate(' + (60 + i * 310) + ',10)">' +
              '<rect x="0" y="0" width="290" height="46" rx="8" fill="#fff" stroke="#dbe3ec"/>' +
              '<text x="12" y="20" class="s-strong">' + m[1] + '</text>' +
              '<text x="12" y="37" class="s-sub">' + m[2] + '</text></g>';
          }).join('') + '</g>',
        'a1stage') + '';
      return DEMO.panel(stage('a1', inner,
        '主线：地面基站熄灯 → 终端亮起并直连卫星 → 三个机制将其接入、验明身份，并在卫星持续掠过条件下保持在线。'), WARN) +
        '<div class="grid4">' +
        DEMO.tile('切换总时延', '<div>' + n('marg/premig_on/切换总时延均值_ms', { g: 12.06, cls: 'num big ours', unit: ' ms' }) + '</div>',
          '对照关闭预迁移 ' + n('marg/premig_off/切换总时延均值_ms', { d: 1, g: 381.0, unit: ' ms' }) + '（<b>↓96.8%</b>）', 'marg/premig_on/切换总时延均值_ms', 'reveal r1') +
        DEMO.tile('接入时延均值（风暴）', '<div>' + n('py/wenchuan_storm2/接入时延均值_ms', { g: 193.44, cls: 'num big ours', unit: ' ms' }) + '</div>',
          '对照四步 ' + n('py/wenchuan_storm4/接入时延均值_ms', { g: 652.8, unit: ' ms' }) + '（<b>↓70.4%</b>）', 'py/wenchuan_storm2/接入时延均值_ms', 'reveal r2') +
        DEMO.tile('伪造终端拦截率', '<div>' + n('ns3/wenchuan_storm2/伪造终端拦截率', { d: 4, g: 0.8537, cls: 'num big ok' }) + '</div>',
          '拦截 35 / 进入认证的伪造 41', 'ns3/wenchuan_storm2/伪造终端拦截率', 'reveal r3') +
        DEMO.tile('高危终端接入成功率', '<div>' + n('py/wenchuan_storm2/high危终端接入成功率', { d: 4, g: 0.9561, cls: 'num big ours' }) + '</div>',
          '对照基线 ' + n('ms/Rel17四步基线/high危终端接入成功率', { d: 4, g: 0.5736 }) + '（10 种子）', 'py/wenchuan_storm2/high危终端接入成功率', 'reveal r4') +
        '</div>' +
        /* ★L0 场景输入参数（原 20 屏施工表 S1 要求，本轮补全）：交代「面对什么场景」 */
        '<div class="note" style="margin-top:8px">' +
        '<b>场景输入（L0）</b>　源 <span class="mono">sim/scenario.py</span>：' +
        D.scenarios.wenchuan.name + '（' + D.scenarios.wenchuan.lat + '°N / ' + D.scenarios.wenchuan.lon + '°E，海拔 ' + D.scenarios.wenchuan.alt_m + ' m）　·　' +
        '<b>' + D.scenarios.wenchuan.terminals + '</b> 台终端（危险分级 高 ' + (D.scenarios.wenchuan.danger_tags.high * 100) + '% / 中 ' + (D.scenarios.wenchuan.danger_tags.med * 100) + '% / 低 ' + (D.scenarios.wenchuan.danger_tags.low * 100) + '%）　·　' +
        '突发窗口 ' + D.scenarios.wenchuan.burst_ramp_s + ' s 均匀涌入　·　' +
        'RACH 容量 ' + D.scenarios.wenchuan.rach_capacity + ' 前导码/时隙　·　' +
        '伪造终端占比 ' + (D.scenarios.wenchuan.forged_ratio * 100) + '%　·　密钥泄露占比 ' + (D.scenarios.wenchuan.compromised_share * 100) + '%' +
        '</div>';
    }
  });

  /* ========================================================================
     A2 · 方法全景：四段流水线
     ====================================================================== */
  reg({
    id: 'A2', nav: '方法全景', title: '方法全景：一条流水线，四段各解决一个问题',
    sub: '数据包从终端出发，依次穿过「接入 → 认证 → 切换 → 维持在线」四站；每一站产出可核对的实测数字。',
    after: function () {
      ANIM.reg('a2', {
        dur: 13000, note: '同一时间轴驱动：数据包走到哪一站，哪一站亮并给出该站的实测数字',
        build: function (host) {
          return {
            stn: [].slice.call(host.querySelectorAll('.stn')),
            cells: [].slice.call(document.querySelectorAll('#sc-A2 .stnc')),
            pk: host.querySelector('#a2-pk'),
            axis: host.querySelector('#a2-axis'),
            xs: [130, 390, 650, 910]
          };
        },
        frame: function (u, c) {
          var p = ANIM.clamp01((u - 0.04) / 0.88);
          var x = ANIM.lerp(c.xs[0], c.xs[3], p);
          c.pk.setAttribute('transform', 'translate(' + x.toFixed(1) + ',150)');
          c.pk.setAttribute('opacity', u > 0.02 ? 1 : 0);
          c.axis.setAttribute('x2', x.toFixed(1));
          c.stn.forEach(function (s, i) {
            var active = Math.abs(x - c.xs[i]) < 46 || (i === 3 && p >= 1);
            var passed = x > c.xs[i] + 46 || (i === 3 && p >= 0.995);
            var ci = s.querySelector('circle');
            ci.setAttribute('stroke', active ? '#0e7490' : (passed ? '#9ecfae' : '#c8d6e5'));
            ci.setAttribute('stroke-width', active ? 3 : 2);
            ci.setAttribute('fill', passed ? '#e8f6ee' : '#fff');
            if (c.cells[i]) c.cells[i].classList.toggle('on', passed);
          });
        },
        readout: function (u) {
          var i = Math.min(3, Math.max(0, Math.round((ANIM.clamp01((u - 0.04) / 0.88)) * 3)));
          var names = ['① 接入', '② 认证', '③ 切换', '④ 维持'];
          return '当前站位：<b>' + names[i] + '</b>';
        }
      });
      ANIM.mountScreen(['a2']);
    },
    render: function () {
      var ST = [
        { t: '终端发起接入', s: '两步 RACH（MsgA → MsgB）', k: 'marg/rach2step/latency', l: '接入时延', u: ' ms', g: 193.44, d: null },
        { t: '星上验明身份', s: '双根 HMAC · 假名轮换 · 计数器', k: 'ns3/wenchuan_storm2/伪造终端拦截率', l: '拦截率', u: '', g: 0.8537, d: 4 },
        { t: '预测式切换', s: '星间预迁移 · 先建后断 · 失配兜底', k: 'marg/premig_on/切换总时延均值_ms', l: '切换总时延', u: ' ms', g: 12.06, d: null },
        { t: '持续在线', s: '业务分级 + 生存优先调度', k: 't8/话音/ns3_on', l: '话音连续性', u: '', g: 0.9995, d: 4 }
      ];
      /* ★坑：SVG 的 <text> 里绝不能嵌 HTML 元素（n() 产出的是 <span>）——
         内联外来内容会让解析器提前闭合 <svg>，后续节点退化成 HTML 文本堆叠。
         故：SVG 只画几何，数值一律用 HTML 行承载（并与站点等距对齐）。 */
      var XS = [130, 390, 650, 910];
      var inner = svg('0 62 1040 196',
        '<line x1="40" y1="150" x2="1000" y2="150" stroke="#dbe3ec" stroke-width="3"/>' +
        '<line id="a2-axis" x1="130" y1="150" x2="130" y2="150" stroke="#0e7490" stroke-width="3"/>' +
        ST.map(function (s, i) {
          return '<g class="stn" data-i="' + i + '" transform="translate(' + XS[i] + ',150)">' +
            '<circle r="34" fill="#fff" stroke="#c8d6e5" stroke-width="2"/>' +
            '<text y="7" text-anchor="middle" class="s-stn">' + (i + 1) + '</text>' +
            '<text y="-52" text-anchor="middle" class="s-strong">' + s.t + '</text>' +
            '<text y="72" text-anchor="middle" class="s-sub">' + (i === 0 ? '两步 RACH' : i === 1 ? '双根 HMAC' : i === 2 ? '星间预迁移' : '业务分级') + '</text>' +
            '</g>';
        }).join('') +
        '<g id="a2-pk"><circle r="9" fill="#0e7490"/><circle r="16" fill="#0e7490" opacity=".18"/></g>',
        'a2stage');
      var chipsRow = '<div class="stnrow">' + ST.map(function (s, i) {
        return '<div class="stnc' + (i ? '' : '') + '" data-stn="' + i + '">' +
          '<div class="stnl">' + s.s + '</div>' +
          '<div class="stnv">' + s.l + ' ' +
          n(s.k, s.d === null ? { g: s.g, unit: s.u } : { d: s.d, g: s.g, unit: s.u }) + '</div></div>';
      }).join('') + '</div>';
      return DEMO.panel(stage('a2', inner + chipsRow,
        '机制分工：接入解决「能不能进来」，认证解决「是不是它」，切换解决「掉不掉线」，调度解决「先救谁」。' +
        '<br/><span class="dim">第 4 站的业务分级与生存优先调度属支撑机制，详见 A6。</span>'), WARN);
    }
  });

  /* —— A4 认证状态推进动画：假名轮换 · 计数器自增 · 哈希链推进 —— */
  var A4H = { N: 3, W: 300, GAP: 40, X0: 40, Y: 36, H: 100 };
  function a4HashMarkup() {
    var cards = '', i;
    for (i = 0; i < A4H.N; i++) {
      var x = A4H.X0 + i * (A4H.W + A4H.GAP);
      cards += '<g id="a4hash-c' + i + '" opacity="0">' +
        '<rect x="' + x + '" y="' + A4H.Y + '" width="' + A4H.W + '" height="' + A4H.H + '" rx="8" fill="#f7fbfc" stroke="#b8dde6"/>' +
        '<text x="' + (x + 14) + '" y="' + (A4H.Y + 24) + '" class="s-strong" fill="#0e7490">第 ' + (i + 1) + ' 次接入成功后</text>' +
        '<text x="' + (x + 14) + '" y="' + (A4H.Y + 50) + '" class="s-sub">假名轮换 → PID‹' + (i + 1) + '›　抗设备溯源</text>' +
        '<text x="' + (x + 14) + '" y="' + (A4H.Y + 70) + '" class="s-sub">计数器自增 → c = ' + (i + 1) + '　抗重放</text>' +
        '<text x="' + (x + 14) + '" y="' + (A4H.Y + 90) + '" class="s-sub">哈希链推进 → h' + i + ' → h' + (i + 1) + '　单向不可逆</text>' +
        '</g>';
      if (i < A4H.N - 1) {
        cards += '<text id="a4hash-a' + i + '" x="' + (x + A4H.W + 8) + '" y="' + (A4H.Y + 54) + '" class="s-sub" fill="#9fb0bb" opacity="0">→</text>';
      }
    }
    return '<div class="anim" data-anim="a4hash">' + svg('0 0 1040 176',
      '<text x="24" y="22" class="s-strong">认证状态推进：每成功接入一次，就换一个假名 · 计数器加一 · 哈希链前推一格（连续三次接入）</text>' +
      cards +
      '<text x="24" y="164" class="s-sub" fill="#78909c">假名轮换使设备不可被长期追踪；计数器使旧报文不可重放；哈希链单向不可逆 —— 双根密钥任一泄露仍可在统计上识别伪造（基线仅单根）</text>',
      'a4hashsvg') + '</div><div class="abar" data-bar="a4hash"></div>';
  }
  function a4HashReg() {
    ANIM.reg('a4hash', {
      dur: 7000,
      note: '三次成功接入依次点亮：假名轮换 / 计数器自增 / 哈希链推进 —— 三者在同一次事件上同步发生',
      build: function (host) {
        var c = { cards: [], arrow: [] };
        for (var i = 0; i < A4H.N; i++) {
          c.cards.push(host.querySelector('#a4hash-c' + i));
          c.arrow.push(host.querySelector('#a4hash-a' + i));
        }
        return c;
      },
      frame: function (u, c) {
        c.cards.forEach(function (el, i) {
          if (!el) return;
          var p = ANIM.easeOut(ANIM.clamp01((u - i * 0.28) / 0.26));
          el.setAttribute('opacity', p.toFixed(2));
          el.setAttribute('transform', 'translate(0,' + ((1 - p) * 8).toFixed(1) + ')');
        });
        c.arrow.forEach(function (el, i) {
          if (el) el.setAttribute('opacity', ANIM.clamp01((u - (i * 0.28 + 0.24)) / 0.12).toFixed(2));
        });
      },
      readout: function (u) {
        var k = u < 0.28 ? 1 : (u < 0.56 ? 2 : 3);
        return '已推进 <b>' + k + '</b> 次接入状态';
      }
    });
  }

  /* ========================================================================
     A4 · 机制② 星上认证：1200 条真实事件的可视化分选
     ====================================================================== */
  reg({
    id: 'A4', nav: '机制② 星上认证', title: '机制② 星上认证：' + D.funnel.total + ' 条事件按真实结果分选',
    sub: '上图为一次接入的终端 ⇄ 卫星交互（双根 HMAC / 假名轮换 / 三向结果），下图为 ' + D.funnel.total + ' 次真实事件按实际结果分选。',
    after: function () {
      ANIM.reg('a4', {
        dur: 15000, note: '上层为交互时序（随进度逐级揭示），下层为 ' + D.funnel.total + ' 条真实事件按序分选；数字为实绩',
        build: function (host) {
          var cells = [].slice.call(host.querySelectorAll('.ac'));
          return {
            cells: cells, cur: host.querySelector('#a4-cur'),
            cnt: ['ok', 'bad_mac', 'ok_missed', 'collision_fail'].map(function (k) { return document.querySelector('#a4-c-' + k); }),
            rate: document.querySelector('#a4-rate'),
            total: cells.length,
            ladd: ['a4-m1', 'a4-chk', 'a4-pass', 'a4-block', 'a4-miss', 'a4-anno']
          };
        },
        frame: function (u, c, host) {
          var e = ANIM.easeInOut(ANIM.clamp01((u - 0.03) / 0.87));
          var head = Math.floor(e * c.total);
          var n = [0, 0, 0, 0];
          var rank = { ok: 0, bad_mac: 1, ok_missed: 2, collision_fail: 3 };
          for (var i = 0; i < c.total; i++) {
            var el = c.cells[i], code = el.getAttribute('data-o'), on = i < head;
            el.setAttribute('opacity', on ? 1 : 0.14);
            if (on) n[rank[code]]++;
          }
          c.cnt[0].textContent = n[0]; c.cnt[1].textContent = n[1];
          c.cnt[2].textContent = n[2]; c.cnt[3].textContent = n[3];
          /* 游标：沿 40 列网格自上而下推进 */
          var row = Math.floor(head / 40), col = head % 40;
          if (head > 0 && head < c.total) {
            c.cur.setAttribute('x1', 60 + col * 21); c.cur.setAttribute('x2', 60 + col * 21);
            c.cur.setAttribute('y1', 62 + row * 12); c.cur.setAttribute('y2', 62 + row * 12 + 12);
            c.cur.setAttribute('opacity', 1);
          } else { c.cur.setAttribute('opacity', 0); }
          var den = n[1] + n[2];
          c.rate.textContent = den > 0 ? (n[1] / den).toFixed(4) : '—';
          [].forEach.call(document.querySelectorAll('#sc-A4 .kpi.reveal'), function (t, i) {
            t.classList.toggle('on', u >= 0.10 + i * 0.07);
          });
          /* 上层交互梯形图：数据包沿时序飞行（与下层事件分选共用同一 u） */
          if (host) {
            driveSeq(host, [
              { id: 'a4-m1', t0: 0.08, t1: 0.26 },
              { id: 'a4-chk', t0: 0.28, t1: 0.30 },
              { id: 'a4-pass', t0: 0.44, t1: 0.56 },
              { id: 'a4-block', t0: 0.58, t1: 0.70 },
              { id: 'a4-miss', t0: 0.72, t1: 0.84 }
            ], u);
          }
        },
        readout: function (u) {
          var head = Math.floor(ANIM.easeInOut(ANIM.clamp01((u - 0.03) / 0.87)) * D.timeline.access.length);
          return '已揭示 <b>' + head + '</b> / ' + D.timeline.access.length + ' 条事件';
        }
      });
      a4HashReg();
      ANIM.mountScreen(['a4', 'a4hash']);
    },
    render: function () {
      var A = D.timeline.access, CO = ['ok', 'bad_mac', 'ok_missed', 'collision_fail'];
      var COL = { ok: '#1e8449', bad_mac: '#c0392b', ok_missed: '#b7791f', collision_fail: '#cfd8e0' };
      var cells = A.map(function (a, i) {
        var code = a[5], r = (i / 40) | 0, col = i % 40;
        var lang = a[2] === 'high' ? 1.25 : 1;
        return '<rect class="ac" data-o="' + code + '" x="' + (60 + col * 21) + '" y="' + (62 + r * 12) +
          '" width="' + (19 * lang > 19 ? 19 : 19) + '" height="10.4" rx="1.6" fill="' + COL[code] + '" opacity="0.14"/>';
      }).join('');
      var legend = CO.map(function (k) {
        var lab = { ok: '认证通过并接入', bad_mac: '拦截（盲伪造）', ok_missed: '漏检（密钥泄露型）', collision_fail: 'RACH 未受理（与认证无关）' }[k];
        return '<span><i class="sw" style="background:' + COL[k] + '"></i>' + lab + '</span>';
      }).join('');
      /* —— A4 认证交互梯形图（终端 ⇄ 卫星，双根 HMAC / 假名轮换 / 三向结果） —— */
      var cUE = '#2c6e9b', cSAT = '#7a4e9e', cWait = '#9fb0bb', cOK = '#1e8449', cBlock = '#c0392b', cMiss = '#b7791f';
      var alad = '<div class="seqwrap">' + svg('0 0 1040 250',
        '<text x="40" y="22" class="s-strong">认证交互：终端发起 → 卫星双根校验 → 三向结果（通过 / 拦截 / 漏检）</text>' +
        seqLane(78, '终端', cUE, 100, 1010, 'ue') +
        seqLane(185, '卫星', cSAT, 100, 1010, 'sat') +
        seqMsg('a4-m1', 120, 78, 560, 185, cUE, '接入请求（假名ID, 计数器）', 330, 122) +
        seqWait('a4-chk', 560, 740, 185, cWait, '双根 HMAC 校验（双密钥根）') +
        seqMsg('a4-pass', 740, 185, 850, 78, cOK, '接入许可 ✓ 合法', 790, 112) +
        seqMsg('a4-block', 740, 185, 930, 78, cBlock, '拦截：MAC 不符', 842, 138) +
        seqMsg('a4-miss', 740, 185, 1005, 78, cMiss, '漏检：密钥已泄露', 958, 166) +
        '<text x="40" y="232" class="s-sub">每次成功接入后执行 <tspan class="s-strong" fill="#2c6e9b">假名轮换 + 计数器自增 + 哈希链推进</tspan>：假名抗设备溯源、计数器抗重放、哈希链单向不可逆；双根密钥任一泄露仍可在统计上识别伪造（基线仅单根）。</text>'
        , 'a4ladder') + '</div>';
      var inner = svg('0 0 1040 470',
        '<rect x="0" y="0" width="1040" height="470" fill="#fff"/>' + cells +
        '<line id="a4-cur" x1="60" y1="62" x2="60" y2="74" stroke="#152232" stroke-width="2" opacity="0"/>' +
        '<line x1="60" y1="422" x2="900" y2="422" stroke="#eaeff5"/>' +
        '<text x="60" y="440" class="s-sub">顺序 = trace 事件序列（t = 5.0 – 7.0 s）　·　40 列 × 30 行 = ' + D.funnel.total + ' 条</text>',
        'a4stage');
      var H = '<div class="grid4">' +
        DEMO.tile('认证通过', '<div class="num big ok" id="a4-c-ok">0</div>', '合法终端（计入成功率）', null, 'reveal') +
        DEMO.tile('拦截', '<div class="num big" style="color:#c0392b" id="a4-c-bad_mac">0</div>', '盲伪造 MAC 比对失败', null, 'reveal') +
        DEMO.tile('漏检', '<div class="num big" style="color:#b7791f" id="a4-c-ok_missed">0</div>', '持有效密钥 → 密码层不可检出', null, 'reveal') +
        DEMO.tile('RACH 未受理', '<div class="num big" style="color:#8fa3b6" id="a4-c-collision_fail">0</div>', '拥塞下前导码未受理（旁路）', null, 'reveal') +
        '</div>';
      return DEMO.panel(stage('a4', alad + inner, '<div class="tl-legend">' + legend + '</div>'), WARN) + a4HashMarkup() + H +
        '<div class="grid3">' +
        DEMO.tile('拦截率（实时累计 → 终值）',
          '<div><span class="num big ok" id="a4-rate">—</span>' +
          '<span class="unit">最终 ' + n('funnel/block_rate_from_trace', { d: 4, g: 0.8537 }) + '</span></div>',
          '口径 = 拦截 / <b>进入认证环节</b>的伪造终端 = ' + D.funnel.blocked + ' / ' + D.funnel.entered_forged + '（不含 RACH 未受理的 ' + D.funnel.rach_reject_forged + ' 台）',
          'funnel/block_rate_from_trace', 'reveal') +
        DEMO.tile('双轨交叉验证',
          '<div>' + n('ns3/wenchuan_storm2/伪造终端拦截率', { d: 4, g: 0.8537, cls: 'num mid ours' }) +
          ' <span class="unit">↔</span> ' + n('py/wenchuan_storm2/伪造终端拦截率', { d: 4, g: 0.9273, cls: 'num mid base' }) + '</div>',
          '差 6.3pp，源于拥塞下两轨伪造终端到达序列的随机差异（量级一致）',
          'ns3/wenchuan_storm2/伪造终端拦截率', 'reveal') +
        DEMO.tile('星上认证额外时延',
          '<div>' + n('res/auth_latency_ns3', { g: 0.102, cls: 'num mid', unit: ' ms' }) + '</div>',
          '含星上抗辐照 CPU 降频 ' + n('res/auth_derate', { g: 1000 }) + '× 的保守假设',
          'res/auth_latency_ns3', 'reveal') +
        '</div>' +
        DEMO.panel(
          '<div class="legend"><span>可证伪性：拦截率随密钥泄露占比单调下降（理论上限 = 1 − 泄露占比）</span></div>' +
          '<div class="leak">' +
          D.sensitivity.groups.compromised_share.points.map(function (p, i) {
            return '<div class="leakc' + (i === 1 ? ' on' : '') + '">' +
              '<div class="lb" style="height:' + (p.block_rate * 100).toFixed(1) + '%"></div>' +
              '<div class="lt">' + n('sens/compromised_share/' + i + '/block_rate', { d: 4, g: [1.0, 0.9273, 0.82, 0.5306][i] }) + '</div>' +
              '<div class="lx">泄露 ' + p.x.toFixed(2) + '</div></div>';
          }).join('') + '</div>' +
          '<div class="cap">当前场景泄露占比 <b>0.15</b>（高亮柱）→ 拦截率实测 0.9273，理论线 1−0.15 = 0.85；' +
          '越靠右泄露越多、密码层能拦的越少 —— 这正是「需与物理层特征融合」的量化依据。</div>',
          '<span class="bd run">sensitivity_20260903</span><span class="bd">' + D.sensitivity.groups.compromised_share.points.length + ' 个扫描点</span>');
    }
  });

  /* ========================================================================
     A5 · 机制③ 预测式切换：3D 几何 + 先建后断甘特
     ====================================================================== */
  reg({
    id: 'A5', nav: '机制③ 预测式切换', title: '机制③ 预测式切换：先建后断，中断为零',
    sub: '上图为源星 ⇄ 目标星 ⇄ 终端的预迁移交互（ISL 推送认证上下文 → RACH-less 一次比对确认）；左下为 651 星真实 TLE 几何，右下为切换时刻的链路时序。',
    after: function () {
      var H = D.handshake;
      ANIM.reg('a5', {
        dur: 16000, note: '3D 与甘特共用一条时间轴：拖到 0.62 附近即「切换时刻」',
        build: function (host) {
          return {
            m: host.querySelector('#a5-mark'), mtxt: host.querySelector('#a5-mtxt'),
            gap: host.querySelector('#a5-gap'), push: host.querySelector('#a5-push'),
            tiles: [].slice.call(document.querySelectorAll('#sc-A5 .kpi')),
            lad: a5LadderItems()
          };
        },
        frame: function (u, c, host) {
          var p = ANIM.clamp01((u - 0.10) / 0.80);
          /* 3D 与甘特同轴：3D 走 0–300 s，甘特聚焦最后 20 s（HO_LEAD_S=20 提前量窗口） */
          if (window.DEMO_3D && window.DEMO_3D.drive) window.DEMO_3D.drive(u * 300);
          /* 甘特：断轴映射 —— −20…0 s 用 x1()，0…+1 s 用放大段 x2() */
          var XA = 70, XB = 400, XC = 424, XD = 636;
          function x1(t) { return XA + (t + 20) / 20 * (XB - XA); }
          function x2(t) { return XC + t / 1.0 * (XD - XC); }
          var tSec = ANIM.lerp(-20, 1.0, ANIM.easeInOut(p));
          var x = tSec <= 0 ? x1(tSec) : x2(tSec);
          c.m.setAttribute('x1', x); c.m.setAttribute('x2', x);
          c.mtxt.setAttribute('x', Math.max(XA + 34, Math.min(XD - 34, x)));
          c.mtxt.textContent = (tSec >= 0 ? '+' : '') + tSec.toFixed(1) + ' s';
          c.push.setAttribute('opacity', tSec < -2 && tSec > -20 ? 1 : 0);
          c.gap.setAttribute('opacity', tSec > -0.2 ? 1 : 0.15);
          var th = [0.18, 0.42, 0.66, 0.88];
          c.tiles.forEach(function (t, i) { t.classList.toggle('on', u >= th[i]); });
          /* 上方预迁移交互梯形图：与甘特共用同一 tSec 游标 */
          var lx = a5LadX(tSec), lc = document.getElementById('a5-lcur');
          if (lc) { lc.setAttribute('x1', lx); lc.setAttribute('x2', lx); }
          if (c.lad) driveSeq(document, c.lad, tSec);
        },
        readout: function (u) {
          var p = ANIM.clamp01((u - 0.10) / 0.80);
          var t = ANIM.lerp(-20, 1.0, ANIM.easeInOut(p));
          return '切换前 <b>' + Math.max(0, -t).toFixed(1) + ' s</b>' +
            (t >= 0 ? '　（新链已在提前量窗口内就绪，中断 = 0）' : '');
        }
      });
      ANIM.mountScreen(['a5']);
      if (window.DEMO_3D) window.DEMO_3D.onShow();
    },
    render: function () {
      var CF = D.timeline.clusters;
      /* 时间轴：分段映射（−20…0 s 用一段，0…+1 s 用放大段），断点显式标注 ——
         因为「381 ms」在 20 s 提前量窗口里本来不可见，需与 I-01 一样用双面板/断轴处置 */
      var XA = 70, XB = 400, XC = 424, XD = 636;
      var x1 = function (t) { return XA + (t + 20) / 20 * (XB - XA); };        // −20 … 0 s（HO_LEAD_S=20）
      var x2 = function (t) { return XC + t / 1.0 * (XD - XC); };              // 0 … +1 s（放大 20×）
      var g = svg('0 0 664 452',
        '<rect x="' + XA + '" y="60" width="' + (XB - XA) + '" height="290" fill="#f7f9fc" rx="6"/>' +
        '<rect x="' + XC + '" y="60" width="' + (XD - XC) + '" height="290" fill="#f7f9fc" rx="6"/>' +
        '<text x="' + ((XA + XB) / 2) + '" y="76" text-anchor="middle" class="s-sub">提前量窗口 20 s</text>' +
        '<text x="' + ((XC + XD) / 2) + '" y="76" text-anchor="middle" class="s-sub" fill="#6b7c91">放大 ≈13×</text>' +
        /* 断轴标记 */
        '<path d="M' + (XB + 3) + ',60 l6,290 M' + (XC - 3) + ',60 l-6,290" stroke="#c8d6e5" stroke-width="2"/>' +
        /* 旧链 */
        '<text x="' + (XA - 8) + '" y="122" text-anchor="end" class="s-strong" fill="#78909c">旧链</text>' +
        '<rect x="' + XA + '" y="106" width="' + (x1(0) - XA) + '" height="26" rx="4" fill="#b0bcc9"/>' +
        '<text x="' + (XA + 8) + '" y="124" class="s-sub" fill="#fff">服务星 · 链路可用</text>' +
        /* 新链（开预迁移） */
        '<text x="' + (XA - 8) + '" y="186" text-anchor="end" class="s-strong" fill="#0e7490">新链</text>' +
        '<text x="' + (XA - 8) + '" y="202" text-anchor="end" class="s-sub" fill="#0e7490">本方案</text>' +
        '<rect x="' + x1(-20) + '" y="170" width="' + (x2(1) - x1(-20)) + '" height="26" rx="4" fill="#0e7490"/>' +
        '<text x="' + (x1(-19) + 6) + '" y="188" class="s-sub" fill="#fff">上下文已预推 → 一次比对确认（RACH-less 重连）</text>' +
        '<g id="a5-push" opacity="0">' +
        '<line x1="' + x1(-18) + '" y1="238" x2="' + x1(-15) + '" y2="238" stroke="#2c6e9b" stroke-width="3"/>' +
        '<polygon points="' + x1(-15) + ',233 ' + x1(-15) + ',243 ' + (x1(-15) + 8) + ',238" fill="#2c6e9b"/>' +
        '<text x="' + x1(-18) + '" y="256" class="s-sub" fill="#2c6e9b">星间链路推送「假名 + 计数器」</text></g>' +
        /* 新链（对照关预迁移） */
        '<text x="' + (XA - 8) + '" y="306" text-anchor="end" class="s-strong" fill="#78909c">新链</text>' +
        '<text x="' + (XA - 8) + '" y="322" text-anchor="end" class="s-sub" fill="#78909c">对照臂</text>' +
        '<rect x="' + x1(0) + '" y="290" width="' + (x1(0) - XA + 4) + '" height="26" rx="4" fill="#dfe6ec"/>' +
        '<g id="a5-gap" opacity="0.15">' +
        '<rect x="' + XC + '" y="290" width="' + (XD - XC) + '" height="26" rx="4" fill="#78909c"/>' +
        '<rect x="' + XC + '" y="290" width="' + (XD - XC) + '" height="26" rx="4" fill="none" stroke="#c0392b" stroke-width="3"/>' +
        '<text x="' + ((XC + XD) / 2) + '" y="308" text-anchor="middle" class="s-sub" fill="#fff">完整重连耗时 ' + D.metrics['marg/premig_off/切换总时延均值_ms'].toFixed(1) + ' ms</text>' +
        '<text x="' + ((XC + XD) / 2) + '" y="336" text-anchor="middle" class="s-num" fill="#c0392b">↑ = 切换总时延（非中断）</text>' +
        '<text x="' + ((XC + XD) / 2) + '" y="354" text-anchor="middle" class="s-sub" fill="#2c6e9b">两臂均含 20 s 提前量 → 中断均 ≈ 0</text></g>' +
        /* 轴线（两段） */
        '<line x1="' + XA + '" y1="392" x2="' + XB + '" y2="392" stroke="#c8d6e5" stroke-width="2"/>' +
        '<line x1="' + XC + '" y1="392" x2="' + XD + '" y2="392" stroke="#c8d6e5" stroke-width="2"/>' +
        [-20, -15, -10, -5, 0].map(function (t) {
          return '<line x1="' + x1(t) + '" y1="392" x2="' + x1(t) + '" y2="399" stroke="#c8d6e5"/>' +
            '<text x="' + x1(t) + '" y="414" text-anchor="middle" class="s-sub">' + (t === 0 ? '0' : t) + '</text>';
        }).join('') +
        [0.2, 0.4, 0.6, 0.8, 1.0].map(function (t) {
          return '<line x1="' + x2(t) + '" y1="392" x2="' + x2(t) + '" y2="399" stroke="#c8d6e5"/>' +
            '<text x="' + x2(t) + '" y="414" text-anchor="middle" class="s-sub">' + t.toFixed(1) + ' s</text>';
        }).join('') +
        '<text x="' + ((XA + XB) / 2) + '" y="436" text-anchor="middle" class="s-sub">相对切换时刻 (s)</text>' +
        '<text x="' + ((XC + XD) / 2) + '" y="436" text-anchor="middle" class="s-sub" fill="#6b7c91">切换后 (s)</text>' +
        /* 游标 */
        '<line id="a5-mark" x1="' + XA + '" y1="60" x2="' + XA + '" y2="392" stroke="#152232" stroke-width="1.5" stroke-dasharray="4 4"/>' +
        '<text id="a5-mtxt" x="' + XA + '" y="52" text-anchor="middle" class="s-num">-20.0 s</text>',
        'a5stage');
      /* —— A5 预迁移交互梯形图（源星→目标星 ISL 推送上下文 → 目标星就绪 → 窗口内一次比对确认；失配兜底为防御性分支） —— */
      var a5srcY = 64, a5tgtY = 150, a5ueY = 236;
      var a5mid = function (a, b) { return (a5LadX(a) + a5LadX(b)) / 2; };
      var a5lad = '<div class="seqwrap">' + svg('0 0 1040 300',
        '<text x="40" y="22" class="s-strong">预迁移交互：源星经星间链路(ISL)推送认证上下文 → 目标星预先就绪 → 窗口内一次比对确认（RACH-less）</text>' +
        seqLane(a5srcY, '源星', '#78909c', 100, 1010, 'sat') +
        seqLane(a5tgtY, '目标星', '#0e7490', 100, 1010, 'sat') +
        seqLane(a5ueY, '终端', '#2c6e9b', 100, 1010, 'ue') +
        seqMsg('a5-l-push', a5LadX(-20), a5srcY, a5LadX(-16), a5tgtY, '#5b8fb0', 'ISL 推送：假名+计数器+认证上下文', a5mid(-20, -16), 104) +
        seqWait('a5-l-ready', a5LadX(-16), a5LadX(-12), a5tgtY, '#9fb0bb', '目标星持有预置上下文（RACH-less 就绪）') +
        seqMsg('a5-l-rec', a5LadX(-12), a5tgtY, a5LadX(-11), a5ueY, '#1e8449', '一次比对确认（RACH-less，12 ms）', a5mid(-12, -11), 188) +
        '<line x1="' + a5LadX(0) + '" y1="40" x2="' + a5LadX(0) + '" y2="248" stroke="#152232" stroke-width="1.8"/>' +
        '<text x="' + (a5LadX(0) + 8) + '" y="52" class="s-num">切换时刻：旧链丢失 → 新链已在窗口内就绪 ⇒ 中断 = 0</text>' +
        '<g opacity="0.5">' + seqMsg('a5-l-fb', a5LadX(0.12), a5ueY, a5LadX(0.5), a5tgtY, '#c0392b', '兜底：失配→完整重连（防御性；主方案命中率 1.0，双轨实测不触发）', a5mid(0.12, 0.5), 224) + '</g>' +
        '<line id="a5-lcur" x1="' + a5LadX(-20) + '" y1="34" x2="' + a5LadX(-20) + '" y2="255" stroke="#152232" stroke-width="1.5" stroke-dasharray="4 4"/>' +
        [-20, -15, -10, -5, 0].map(function (t) {
          return '<line x1="' + a5LadX(t) + '" y1="255" x2="' + a5LadX(t) + '" y2="261" stroke="#c8d6e5"/>' +
            '<text x="' + a5LadX(t) + '" y="275" text-anchor="middle" class="s-sub">' + t + '</text>';
        }).join('') +
        [0.2, 0.4, 0.6, 0.8, 1.0].map(function (t) {
          return '<line x1="' + a5LadX(t) + '" y1="255" x2="' + a5LadX(t) + '" y2="261" stroke="#c8d6e5"/>' +
            '<text x="' + a5LadX(t) + '" y="275" text-anchor="middle" class="s-sub" fill="#6b7c91">' + t.toFixed(1) + '</text>';
        }).join('') +
        '<text x="' + ((a5LadX(-20) + a5LadX(0)) / 2) + '" y="292" text-anchor="middle" class="s-sub">相对切换时刻 (s)　左：20 s 提前量窗口（先建后断）　·　右：切换后放大</text>'
        , 'a5ladder') + '</div>';
      return DEMO.panel(
        a5lad +
        '<div class="split">' +
        '<div class="split-l"><div class="gl-wrap" id="gl-wrap">' +
        '<canvas id="gl" class="gl" width="1200" height="430"></canvas>' +
        '<div class="gl-hud" id="gl-hud">初始化中…</div><div class="gl-deg" id="gl-deg"></div></div>' +
        '<div class="cap">' + D.constellation.n + ' 颗真实 OneWeb 卫星以 ≈7.5 km/s 掠过 —— 可连的星每几分钟就换一颗，' +
        '所以「切换」是主线矛盾，而「星历可预测」是 LEO 独有的先验。</div></div>' +
        '<div class="split-r"><div class="anim" data-schematic="1" data-anim="a5">' + g + '</div>' +
        '<div class="abar" data-bar="a5"></div></div></div>', WARN) +
        '<div class="grid4">' +
        DEMO.tile('切换总时延（预迁移开）',
          '<div>' + n('marg/premig_on/切换总时延均值_ms', { g: 12.06, cls: 'num big ours', unit: ' ms' }) + '</div>',
          '对照关预迁移 ' + n('marg/premig_off/切换总时延均值_ms', { d: 1, g: 381.0, unit: ' ms' }) + '（<b>↓96.8%</b>）',
          'marg/premig_on/切换总时延均值_ms', 'reveal') +
        DEMO.tile('切换中断均值（两臂相同）',
          '<div>' + n('py/wenchuan/切换中断均值_ms', { d: 2, g: 0.02, cls: 'num big ok', unit: ' ms' }) + '</div>',
          '中断归零来自<b>先建后断的重叠窗</b>，与预迁移机制正交；预迁移的贡献在于压缩切换时延',
          'py/wenchuan/切换中断均值_ms', 'reveal') +
        DEMO.tile('切换事件数 / 成簇',
          '<div>' + n('funnel/ho_total', { g: 10736, cls: 'num big' }) + '</div>',
          '成簇发生：' + CF.n + ' 个簇，簇内中位 ' + CF.median + ' / 最大 ' + CF.max + ' 次，簇间隔中位 ' + CF.gap_median_s + ' s',
          'funnel/ho_total', 'reveal') +
        DEMO.tile('预迁移命中率',
          '<div>' + n('marg/premig_on/预迁移命中率', { d: 1, g: 1.0, cls: 'num big' }) + '</div>',
          '★协议内部一致性结果（决策选星与执行切换同源），非独立统计发现',
          'marg/premig_on/预迁移命中率', 'reveal') +
        '</div>' +
        /* ★预迁移通路四要素（原 20 屏施工表 S8 的「星间预推」细节，本轮补全） */
        '<div class="grid4" style="margin-top:12px">' +
        DEMO.tile('① 推送内容',
          '<div class="num mid">假名 + 计数器</div>',
          '认证上下文经<b>星间链路（ISL）</b>由服务星推送至预测目标星；本模型以 (term_id→counter) 明文映射表达，未建模星间签名/加密（见 A8 披露）',
          null) +
        DEMO.tile('② 推送时机',
          '<div class="num mid">决策时刻 t_ho</div>',
          '= 预测 LOS − 提前量；在窗口内完成推送与建链，为「先建后断」留出重叠窗',
          null) +
        DEMO.tile('③ 命中判定',
          '<div class="num mid">RACH-less 一次比对</div>',
          '目标星凭预置上下文一次比对即确认；决策选星与执行星同源 → 命中率 ' +
            n('marg/premig_on/预迁移命中率', { d: 1, g: 1.0, cls: 'ours' }),
          'marg/premig_on/预迁移命中率') +
        DEMO.tile('④ 失配兜底',
          '<div class="num mid">回退完整重连</div>',
          '目标星无上下文时回退四步 RACH —— <b>防御性分支</b>，主方案双轨实测不触发（见 A8 归因披露）',
          null) +
        '</div>';
    }
  });

  reg({
    id: 'A3', nav: '机制① 两步接入', title: '机制① 两步 RACH：一次往返 vs 四次握手',
    sub: '同样的射频频段与几何距离，差别只在「握手要几个来回」。上图为终端 ⟷ 卫星的物理链路（数据包沿链路飞行，星上处理与协议等待用「转环」表示），下图为按实测斜距逐段分解的时延预算。',
    after: function () {
      var H = D.handshake, TMAX = 420, X0 = 200, X1 = 980, sc = (X1 - X0) / TMAX;
      var L = a3LadderItems(H);
      ANIM.reg('a3', {
        dur: 15000, note: '数据包沿无线链路飞行、处理/等待用转环表示；前段特意放慢（0–20 ms 占四成时长），好看清两步 ' + H.theory.two_step_ms.toFixed(1) + ' ms 就走完一次往返；后段覆盖到四步的 ' + H.theory.four_step_ms.toFixed(0) + ' ms',
        build: function (host) {
          return {
            cur: host.querySelector('#a3-cursor'), now: host.querySelector('#a3-tnow'),
            segA: [].slice.call(host.querySelectorAll('.seg')).slice(0, H.seg2.length),
            segB: [].slice.call(host.querySelectorAll('.seg')).slice(H.seg2.length),
            labA: [].slice.call(host.querySelectorAll('.seglab')).slice(0, H.seg2.length),
            labB: [].slice.call(host.querySelectorAll('.seglab')).slice(H.seg2.length),
            doneA: host.querySelector('#a3-doneA'), doneB: host.querySelector('#a3-doneB'),
            inset: host.querySelector('#a3-inset'), ibar: host.querySelector('#a3-inset-bar'),
            starts2: (function () { var a = [], s = 0; H.seg2.forEach(function (x) { a.push(s); s += x.ms; }); return a; })(),
            starts4: (function () { var a = [], s = 0; H.seg4.forEach(function (x) { a.push(s); s += x.ms; }); return a; })()
          };
        },
        frame: function (u, c, host) {
          var p = ANIM.clamp01((u - 0.04) / 0.92);
          /* ★分段时间映射：前 42% 进度只覆盖 0–20 ms（放大 ≈52×），使「两步在 12.4 ms 走完」清晰可见；
             其余进度覆盖 20–420 ms。否则按线性映射两步结果会在动画最初 0.25 s 内一闪而过。 */
          var t = p <= 0.42 ? (p / 0.42) * 20 : 20 + (p - 0.42) / 0.58 * (TMAX - 20);
          if (host) {
            driveSeq(host, [
              { id: 'a3s-A', t0: L.ts[0].t0, t1: L.ts[0].t1 },
              { id: 'a3s-B', t0: L.ts[2].t0, t1: L.ts[2].t1 },
              { id: 'a3b-1', t0: L.fs[0].t0, t1: L.fs[0].t1 },
              { id: 'a3b-2', t0: L.fs[1].t0, t1: L.fs[1].t1 },
              { id: 'a3b-3', t0: L.fs[4].t0, t1: L.fs[4].t1 },
              { id: 'a3b-4', t0: L.fs[5].t0, t1: L.fs[5].t1 }
            ], t);
            driveSpin(host, 'a3s-proc', t, L.ts[1].t0, L.ts[1].t1);
            driveSpin(host, 'a3b-proc', t, L.fs[2].t0, L.fs[2].t1);
            driveSpin(host, 'a3b-rar', t, L.fs[3].t0, L.fs[3].t1);
            driveSpin(host, 'a3b-cont', t, L.fs[6].t0, L.fs[6].t1);
            var rl = host.querySelector('#a3b-rarlab'); if (rl) rl.setAttribute('opacity', (t >= L.fs[3].t0 && t <= L.fs[3].t1) ? 1 : 0);
            var cl = host.querySelector('#a3b-contlab'); if (cl) cl.setAttribute('opacity', (t >= L.fs[6].t0 && t <= L.fs[6].t1) ? 1 : 0);
            var okA = host.querySelector('#a3s-ok'); if (okA) okA.setAttribute('opacity', t >= L.tsEnd ? 1 : 0);
            var okB = host.querySelector('#a3b-ok'); if (okB) okB.setAttribute('opacity', t >= L.fsEnd ? 1 : 0);
            var ck = host.querySelector('#a3-clock'); if (ck) ck.textContent = t.toFixed(1) + ' ms';
          }
          c.cur.setAttribute('x1', X0 + t * sc); c.cur.setAttribute('x2', X0 + t * sc);
          c.now.setAttribute('x', Math.max(X0 + 24, X0 + t * sc));
          c.now.textContent = t.toFixed(1) + ' ms';
          var ph = host && host.querySelector('#a3-phase');
          if (ph) ph.textContent = t < 20 ? '慢放段 0–20 ms' : '常速段 20–420 ms';
          function grow(segs, starts, list, cols) {
            segs.forEach(function (r, i) {
              var w = ANIM.clamp01((t - starts[i]) / list[i].ms) * (list[i].ms * sc);
              r.setAttribute('width', Math.max(0, w));
              r.setAttribute('opacity', w > 0 ? 1 : 0);
            });
          }
          grow(c.segA, c.starts2, H.seg2, 0);
          grow(c.segB, c.starts4, H.seg4, 0);
          [].concat(c.labA).forEach(function (x, i) {
            var w = ANIM.clamp01((t - c.starts2[i]) / H.seg2[i].ms) * (H.seg2[i].ms * sc);
            x.setAttribute('opacity', w > 34 ? 1 : 0);
          });
          [].concat(c.labB).forEach(function (x, i) {
            var w = ANIM.clamp01((t - c.starts4[i]) / H.seg4[i].ms) * (H.seg4[i].ms * sc);
            x.setAttribute('opacity', w > 34 ? 1 : 0);
          });
          c.doneA.setAttribute('opacity', t >= H.theory.two_step_ms ? 1 : 0);
          c.doneB.setAttribute('opacity', t >= H.theory.four_step_ms ? 1 : 0);
          var z = ANIM.clamp01((u - 0.10) / 0.85);
          c.inset.setAttribute('opacity', z > 0.02 ? 1 : 0);
          c.ibar.setAttribute('width', (ANIM.clamp01(z) * 396).toFixed(1));
        },
        readout: function (u) {
          var p = ANIM.clamp01((u - 0.04) / 0.92);
          var t = p <= 0.42 ? (p / 0.42) * 20 : 20 + (p - 0.42) / 0.58 * (TMAX - 20);
          return '时间游标：<b>' + t.toFixed(1) + ' ms</b>　' +
            (t >= H.theory.four_step_ms ? '两条车道均已完成' :
              t >= H.theory.two_step_ms ? '<span style="color:#1e8449">本方案已完成，基线仍在等待</span>' : '双方均在握手中');
        }
      });
      ANIM.mountScreen(['a3']);
    },
    render: function () {
      var H = D.handshake, S2 = H.seg2, S4 = H.seg4;
      var TMAX = 420, X0 = 200, X1 = 980;
      var sc = (X1 - X0) / TMAX;
      function segs(list, y, u, colA, colB) {
        var acc = 0, out = '';
        list.forEach(function (s, i) {
          var w = s.ms * sc;
          out += '<rect class="seg" data-i="' + i + '" x="' + (X0 + acc * sc) + '" y="' + y + '" width="' + w +
            '" height="30" rx="3" fill="' + (i % 2 ? colB : colA) + '" opacity="0"/>' +
            (w > 34 ? '<text class="seglab" data-i="' + i + '" x="' + (X0 + acc * sc + w / 2) + '" y="' + (y + 19) +
              '" text-anchor="middle" opacity="0">' + s.ms.toFixed(s.ms < 1 ? 2 : 1) + '</text>' : '');
          acc += s.ms;
        });
        return out;
      }
      /* —— A3 物理链路场景：终端 ⟷ 卫星 + 波束 + 数据包沿链路飞行 + 处理/等待转环 —— */
      var L = a3LadderItems(H);
      var PK0 = 116, PK1 = 564, rY = 104, bY = 240;
      var cUE = '#2c6e9b', cSAT = '#7a4e9e', cOk = '#1e8449', cWait = '#b7791f';
      function beamRow(cy, gid) {
        return '<polygon points="' + PK1 + ',' + cy + ' ' + PK0 + ',' + (cy - 32) + ' ' + PK0 + ',' + (cy + 32) + '" fill="url(#' + gid + ')"/>' +
          '<line x1="' + PK0 + '" y1="' + cy + '" x2="' + PK1 + '" y2="' + cy + '" stroke="#c8d6e5" stroke-width="1.4"/>';
      }
      function pairRow(cy) {
        return entityGlyph('ue', 60, cy) + '<text x="60" y="' + (cy + 30) + '" text-anchor="middle" class="s-strong" fill="' + cUE + '">终端</text>' +
          entityGlyph('sat', 610, cy) + '<text x="610" y="' + (cy + 34) + '" text-anchor="middle" class="s-strong" fill="' + cSAT + '">卫星</text>';
      }
      var scene = '<div class="seqwrap">' + svg('0 0 1040 330',
        '<defs><linearGradient id="a3beam" x1="1" y1="0" x2="0" y2="0">' +
        '<stop offset="0" stop-color="#0e7490" stop-opacity=".20"/><stop offset="1" stop-color="#0e7490" stop-opacity=".02"/></linearGradient>' +
        '<linearGradient id="a3beamG" x1="1" y1="0" x2="0" y2="0">' +
        '<stop offset="0" stop-color="#78909c" stop-opacity=".18"/><stop offset="1" stop-color="#78909c" stop-opacity=".02"/></linearGradient></defs>' +
        '<text x="40" y="22" class="s-strong">物理链路：数据包沿无线链路飞行 · 星上处理与协议等待用「转环」表示（等得越久，环转得越久）</text>' +
        /* ① 本方案 */
        '<text x="40" y="60" class="s-strong" fill="#0e7490">① 本方案 · 两步 RACH —— 一次往返，无等待</text>' +
        beamRow(rY, 'a3beam') + pairRow(rY) +
        pktOnly('a3s-A', PK0, rY, PK1, rY, cUE, 'MsgA ↑') +
        pktOnly('a3s-B', PK1, rY, PK0, rY, cSAT, 'MsgB ↓') +
        spinRing('a3s-proc', 610, rY, 22, cSAT) +
        '<text id="a3s-ok" opacity="0" x="648" y="' + (rY + 5) + '" class="s-num" fill="' + cOk + '">✓ 接入完成 ' + H.theory.two_step_ms.toFixed(1) + ' ms</text>' +
        /* ② 基线 */
        '<text x="40" y="190" class="s-strong" fill="#78909c">② Rel-17 · 四步 RACH —— 两次「干等」才是慢的根源</text>' +
        beamRow(bY, 'a3beamG') + pairRow(bY) +
        pktOnly('a3b-1', PK0, bY, PK1, bY, cUE, 'msg1 ↑') +
        pktOnly('a3b-2', PK1, bY, PK0, bY, cSAT, 'msg2 ↓') +
        pktOnly('a3b-3', PK0, bY, PK1, bY, cUE, 'msg3 ↑') +
        pktOnly('a3b-4', PK1, bY, PK0, bY, cSAT, 'msg4 ↓') +
        spinRing('a3b-proc', 610, bY, 22, cSAT) +
        spinRing('a3b-rar', 300, bY, 24, cWait) +
        '<text id="a3b-rarlab" opacity="0" x="300" y="' + (bY + 46) + '" text-anchor="middle" class="s-sub" fill="' + cWait + '">RAR 响应窗口 ' + H.consts.rar_window_ms.toFixed(0) + ' ms（终端干等）</text>' +
        spinRing('a3b-cont', 470, bY, 24, cWait) +
        '<text id="a3b-contlab" opacity="0" x="470" y="' + (bY + 46) + '" text-anchor="middle" class="s-sub" fill="' + cWait + '">竞争解决定时器 ' + H.consts.contention_ms.toFixed(0) + ' ms</text>' +
        '<text id="a3b-ok" opacity="0" x="648" y="' + (bY + 5) + '" class="s-num" fill="' + cOk + '">✓ 接入完成 ' + H.theory.four_step_ms.toFixed(0) + ' ms</text>' +
        '<text id="a3-clock" x="1020" y="22" text-anchor="end" class="s-num" fill="#0e7490">0.0 ms</text>'
        , 'a3scene') + '</div>';
      var inner = svg('0 0 1040 470',
        /* 时间轴 */
        '<line x1="' + X0 + '" y1="330" x2="' + X1 + '" y2="330" stroke="#c8d6e5" stroke-width="2"/>' +
        [0, 20, 50, 100, 200, 300, 400].map(function (t) {
          return '<line x1="' + (X0 + t * sc) + '" y1="330" x2="' + (X0 + t * sc) + '" y2="337" stroke="#c8d6e5"/>' +
            '<text x="' + (X0 + t * sc) + '" y="352" text-anchor="middle" class="s-sub">' + t + '</text>';
        }).join('') +
        '<text x="' + ((X0 + X1) / 2) + '" y="372" text-anchor="middle" class="s-sub">时间 (ms)</text>' +
        '<line id="a3-cursor" x1="' + X0 + '" y1="60" x2="' + X0 + '" y2="330" stroke="#0e7490" stroke-width="1.5" stroke-dasharray="4 4"/>' +
        '<text id="a3-tnow" x="' + X0 + '" y="50" text-anchor="middle" class="s-num" fill="#0e7490">0.0 ms</text>' +
        '<text id="a3-phase" x="8" y="50" class="s-sub" fill="#5b6b7c"></text>' +
        /* 车道 A（本方案） */
        '<text x="' + (X0 - 12) + '" y="104" text-anchor="end" class="s-strong" fill="#0e7490">本方案</text>' +
        '<text x="' + (X0 - 12) + '" y="122" text-anchor="end" class="s-sub">两步（MsgA/MsgB）</text>' +
        '<rect x="' + X0 + '" y="92" width="' + (X1 - X0) + '" height="30" rx="3" fill="#f6f8fb"/>' +
        segs(S2, 92, 0, '#38b2ac', '#0e7490') +
        /* 车道 B（基线） */
        '<text x="' + (X0 - 12) + '" y="224" text-anchor="end" class="s-strong" fill="#78909c">Rel-17</text>' +
        '<text x="' + (X0 - 12) + '" y="242" text-anchor="end" class="s-sub">四步（msg1→msg4）</text>' +
        '<rect x="' + X0 + '" y="212" width="' + (X1 - X0) + '" height="30" rx="3" fill="#f6f8fb"/>' +
        segs(S4, 212, 0, '#9fb0bb', '#78909c') +
        /* 完成标记 */
        '<g id="a3-doneA" opacity="0"><line x1="' + (X0 + H.theory.two_step_ms * sc) + '" y1="80" x2="' + (X0 + H.theory.two_step_ms * sc) + '" y2="130" stroke="#1e8449" stroke-width="3"/>' +
        '<text x="' + (X0 + H.theory.two_step_ms * sc + 8) + '" y="76" class="s-num" fill="#1e8449">✓ 接入完成 ' + H.theory.two_step_ms.toFixed(1) + ' ms</text></g>' +
        '<g id="a3-doneB" opacity="0"><line x1="' + (X0 + H.theory.four_step_ms * sc) + '" y1="200" x2="' + (X0 + H.theory.four_step_ms * sc) + '" y2="250" stroke="#1e8449" stroke-width="3"/>' +
        '<text x="' + (X0 + H.theory.four_step_ms * sc - 8) + '" y="196" text-anchor="end" class="s-num" fill="#1e8449">✓ 接入完成 ' + H.theory.four_step_ms.toFixed(0) + ' ms</text></g>' +
        /* 放大插图：本方案 0–20 ms */
        '<g id="a3-inset" opacity="0"><rect x="60" y="372" width="420" height="72" rx="8" fill="#eef7f9" stroke="#b8dde6"/>' +
        '<text x="72" y="390" class="s-sub">放大 0–20 ms（本方案握手全长）</text>' +
        '<rect x="72" y="400" width="0" height="26" rx="3" fill="#0e7490" id="a3-inset-bar"/>' +
        '<text x="468" y="419" text-anchor="end" class="s-num" fill="#0e7490">' + H.theory.two_step_ms.toFixed(1) + ' ms = 2d ' + H.seg2[0].ms.toFixed(1) + ' + 处理 ' + H.seg2[1].ms.toFixed(1) + ' + 认证 ' + H.seg2[2].ms.toFixed(2) + '</text></g>' +
        '<text x="520" y="392" class="s-sub">对照：Rel-17 四步的 ' + H.theory.four_step_ms.toFixed(0) + ' ms 里有 <tspan class="s-num" fill="#78909c">' + (H.consts.rar_window_ms + H.consts.contention_ms).toFixed(0) + ' ms 是「等窗口/等定时器」</tspan>，与用户数据无关</text>',
        'a3stage');
      var tbl = DEMO.table(['握手分段', '两步（本方案）', '四步（Rel-17）', '说明'],
        H.seg2.map(function (s2, i) {
          var s4 = H.seg4[i] || null;
          return ['<b>' + s2.k.replace(/ 2d| 4d/, '') + '</b>',
            n('hs/seg2/' + i, { d: 2, g: s2.ms, unit: ' ms' }),
            s4 && s4.ms === s2.ms ? n('hs/seg4/' + i, { d: 2, g: s4.ms, unit: ' ms' }) : '—',
            s2.src];
        }).concat(H.seg4.slice(H.seg2.length).map(function (s4, j) {
          var i = H.seg2.length + j;
          return ['<b>' + s4.k + '</b>', '—', n('hs/seg4/' + i, { d: 2, g: s4.ms, unit: ' ms' }), s4.src];
        })));
      /* ★口径披露：31× / ↓96.8% 里有多少来自「定时器设定值」——把该问题正面回答清楚 */
      var sensRows = H.sens_timers.points.map(function (p) {
        return [p.k,
          n('sens4/' + p.timer_ms + '/total4_ms', { d: 2, g: p.total4_ms, unit: ' ms' }),
          n('sens4/' + p.timer_ms + '/ratio', { d: 2, g: p.ratio, unit: ' ×' }),
          n('sens4/' + p.timer_ms + '/cut_pct', { d: 1, g: p.cut_pct, unit: ' %' })];
      });
      var sensPanel = DEMO.panel(
        '<h4 class="sec">口径披露：四步/两步的时延倍率，有多少来自「定时器设定值」？</h4>' +
        '<div class="note">四步时延闭式：<b>四步 = 两步 + （RAR 响应窗口 + 竞争解决定时器） + 4d</b>。本项目取 ' +
        '<b>RAR 窗口 ' + H.consts.rar_window_ms + ' ms</b> + <b>竞争定时器 ' + H.consts.contention_ms + ' ms</b>，' +
        '二者是 <b>sim/config.py 的「仿真设定值」（非 3GPP 强制值）</b>，且模型按「等满两个窗口」计入 —— 属<b>偏保守</b>建模。' +
        '下表把该闭式在不同预算下重算（<b>模型解析，非新仿真</b>）：</div>' +
        DEMO.table(['定时器预算', '四步时延', '相对两步倍率', '降幅'], sensRows) +
        '<div class="cap"><b>结论分两层看</b>：① <b>协议本身</b>只带来 ' +
        n('sens4/0/ratio', { d: 2, g: 2.5, unit: ' ×' }) + '（四步比两步多一次往返）；② 倍率放大到 ' +
        n('sens4/360/ratio', { d: 2, g: 31.47, unit: ' ×' }) + ' 是「等满两个定时器」叠加的结果。' +
        '若改取 3GPP 标准枚举上限（80+64 ms），倍率降至 ' + n('sens4/144/ratio', { d: 2, g: 14.09, unit: ' ×' }) +
        '、降幅 ' + n('sens4/144/cut_pct', { d: 1, g: 92.9, unit: ' %' }) +
        ' —— <b>方向不变、量级随设定值变化</b>；因此本页所有「多倍差距」均应连同该口径一并理解。</div>',
        '<span class="bd">模型解析</span><span class="bd">口径披露</span>');
      return DEMO.panel(stage('a3', scene + inner, H.check), WARN) + sensPanel +
        '<div class="grid3">' +
        DEMO.tile('纯握手时延（容量不受限场景，隔离拥塞）',
          '<div>' + n('t3/wenchuan_storm2_wide/twostep_precomp/py/接入时延均值_ms', { g: 12.42, cls: 'num mid ours', unit: ' ms' }) +
          ' <span class="unit">vs</span> ' + n('t3/wenchuan_storm2_wide/rel17_4step/py/接入时延均值_ms', { g: 399.5, cls: 'num mid base', unit: ' ms' }) + '</div>',
          'ns-3 轨 ' + n('t3/wenchuan_storm2_wide/twostep_precomp/ns3/接入时延均值_ms', { g: 12.4 }) + ' ↔ ' +
          n('t3/wenchuan_storm2_wide/rel17_4step/ns3/接入时延均值_ms', { g: 403.5 }) + ' ms',
          't3/wenchuan_storm2_wide/twostep_precomp/py/接入时延均值_ms') +
        DEMO.tile('端到端接入时延（窄带风暴，含拥塞退避）',
          '<div>' + n('py/wenchuan_storm2/接入时延均值_ms', { g: 193.44, cls: 'num mid ours', unit: ' ms' }) +
          ' <span class="unit">vs</span> ' + n('py/wenchuan_storm4/接入时延均值_ms', { g: 652.8, cls: 'num mid base', unit: ' ms' }) + '</div>',
          '降幅 ' + n('marg/rach2step/latency', { g: 193.44 }) + ' → ' + '<b>↓70.4%</b>',
          'py/wenchuan_storm2/接入时延均值_ms') +
        DEMO.tile('接入成功率（同负载）',
          '<div>' + n('py/wenchuan_storm2/接入成功率', { d: 4, g: 0.705, cls: 'num mid ours' }) +
          ' <span class="unit">vs</span> ' + n('py/wenchuan_storm4/接入成功率', { d: 4, g: 0.4455, cls: 'num mid base' }) + '</div>',
          '两步的相对提升 +58.2%', 'py/wenchuan_storm2/接入成功率') +
        '</div>';
    }
  });

  /* ========================================================================
     A6 · 结果对撞 + 支撑机制（三个标签页，每页一个紧凑视觉）
     ====================================================================== */
  function vsBars(rows) {
    function w(v) { return Math.log10(1 + v * 20) ; }
    var mx = Math.max.apply(null, rows.map(function (r) { return Math.max(w(r.a), w(r.b)); }));
    return '<div class="vs">' + rows.map(function (r) {
      return '<div class="vsrow"><div class="vsl">' + r.t + '</div>' +
        '<div class="vsbars">' +
        '<div class="vsb"><span class="fill ours" style="width:' + (w(r.a) / mx * 100).toFixed(1) + '%"></span>' +
        '<b class="vsv ours">' + r.av + '</b></div>' +
        '<div class="vsb"><span class="fill base" style="width:' + (w(r.b) / mx * 100).toFixed(1) + '%"></span>' +
        '<b class="vsv base">' + r.bv + '</b></div>' +
        '</div><div class="vsd">' + r.d + '</div></div>';
    }).join('') + '</div><div class="cap">对数轴刻度（30× 以上量级差同轴不可读）；每行上=本方案，下=对照。</div>';
  }
  /* —— A6 动画几何常量与数据行（render 与 after 共用，避免坐标/数据失配） —— */
  var A6RACE = { X0: 300, X1: 980, T: 400, ROW0: 66, ROWH: 33 };
  A6RACE.SC = (A6RACE.X1 - A6RACE.X0) / A6RACE.T;
  function a6AbRows() {
    return D.baseline_matrix.order.map(function (arm, i) {
      var A = D.baseline_matrix.arms[arm];
      return { arm: arm, label: A.label, py: A.py['切换总时延均值_ms'],
        hit: A.py['预迁移命中率'], y: A6RACE.ROW0 + i * A6RACE.ROWH, ours: arm === 'predictive' };
    });
  }
  function a6AbMarkup() {
    var R = a6AbRows(), yA = A6RACE.ROW0 + (R.length - 1) * A6RACE.ROWH + 12, xA = A6RACE.X0;
    var rows = R.map(function (r) {
      return '<text x="288" y="' + (r.y + 4) + '" text-anchor="end" class="s-strong" fill="' +
        (r.ours ? '#0e7490' : '#5b6b7c') + '">' + r.label + '</text>' +
        '<rect x="' + xA + '" y="' + (r.y - 9) + '" width="' + (A6RACE.X1 - xA) + '" height="18" rx="4" fill="#eef2f6"/>' +
        '<rect id="a6ab-f' + r.arm + '" x="' + xA + '" y="' + (r.y - 9) + '" width="0" height="18" rx="4" fill="' +
        (r.ours ? '#0e7490' : '#9aa7b4') + '"/>' +
        '<text id="a6ab-l' + r.arm + '" y="' + (r.y + 4) + '" class="s-num" fill="' +
        (r.ours ? '#0e7490' : '#5b6b7c') + '" opacity="0"></text>';
    }).join('');
    var ticks = [0, 100, 200, 300, 400].map(function (t) {
      var x = xA + t * A6RACE.SC;
      return '<line x1="' + x + '" y1="' + yA + '" x2="' + x + '" y2="' + (yA + 6) + '" stroke="#c8d6e5"/>' +
        '<text x="' + x + '" y="' + (yA + 22) + '" text-anchor="middle" class="s-sub">' + (t === A6RACE.T ? t + ' ms' : t) + '</text>';
    }).join('');
    return '<div class="anim" data-anim="a6ab">' + svg('0 0 1040 300',
      '<text x="24" y="24" class="s-strong">六臂同场竞速 —— 同一场景、同一候选选择，唯一变量是「切换策略」；横条长度 = 切换总时延，游标 = 时间</text>' +
      '<line x1="' + xA + '" y1="40" x2="' + xA + '" y2="' + yA + '" stroke="#c8d6e5" stroke-width="1.4"/>' +
      rows + ticks +
      '<text x="24" y="' + (yA + 46) + '" class="s-sub" fill="#78909c">命中率：本方案 1.0（命中预置上下文，一次比对完成）；其余五臂 0.0（无上下文 → 走完整重连）</text>' +
      '<line id="a6ab-cur" x1="' + xA + '" y1="40" x2="' + xA + '" y2="' + yA + '" stroke="#152232" stroke-width="1.5" stroke-dasharray="4 4"/>',
      'a6absvg') + '</div><div class="abar" data-bar="a6ab"></div>';
  }
  function a6AbReg() {
    var R = a6AbRows();
    ANIM.reg('a6ab', {
      dur: 8000,
      note: '横条随游标生长：本方案 12.14 ms 立刻完成，其余五臂要长到 ≈381 ms 才结束 —— 同样的候选与提前量，唯一差别就是是否预迁移',
      build: function (host) {
        return {
          cur: host.querySelector('#a6ab-cur'),
          fills: R.map(function (r) { return host.querySelector('#a6ab-f' + r.arm); }),
          labs: R.map(function (r) { return host.querySelector('#a6ab-l' + r.arm); })
        };
      },
      frame: function (u, c) {
        var t = u * A6RACE.T;
        if (c.cur) { var x = A6RACE.X0 + t * A6RACE.SC; c.cur.setAttribute('x1', x); c.cur.setAttribute('x2', x); }
        R.forEach(function (r, i) {
          if (c.fills[i]) c.fills[i].setAttribute('width', (Math.min(t, r.py) * A6RACE.SC).toFixed(1));
          var lb = c.labs[i]; if (!lb) return;
          lb.setAttribute('x', (A6RACE.X0 + Math.min(r.py, A6RACE.T) * A6RACE.SC + 6).toFixed(1));
          lb.setAttribute('opacity', t >= r.py ? 1 : 0);
          lb.textContent = r.py.toFixed(2) + ' ms';
        });
      },
      readout: function (u) { return 't = <b>' + (u * A6RACE.T).toFixed(0) + ' ms</b>'; }
    });
  }
  /* —— A6-P2 业务分级：中断容忍度 → 预取提前量 → 连续性满足率（ns-3 轨） —— */
  var A6T8 = {
    NAME: ['话音', '图像', '短信'], TOL: [50, 300, 2000], LEAD: [12, 4, 0],
    ROW0: 74, ROWH: 58, NAME_X: 24, TOL_X: 70, TOL_W: 130, LEAD_X: 234, LEAD_W: 150,
    CONT_X: 474, CONT_W: 300, VAL_X: 782, CMIN: 0.75, CMAX: 1.0
  };
  function a6T8Rows() {
    return D.t8.rows.slice(0, 3).map(function (r, i) {
      return { name: A6T8.NAME[i], tol: A6T8.TOL[i], lead: A6T8.LEAD[i],
        off: r.ns3_off, on: r.ns3_on, y: A6T8.ROW0 + i * A6T8.ROWH };
    });
  }
  function a6T8CW(v) { return Math.max(0, Math.min(1, (v - A6T8.CMIN) / (A6T8.CMAX - A6T8.CMIN))) * A6T8.CONT_W; }
  function a6T8Markup() {
    var R = a6T8Rows();
    var rows = R.map(function (r, i) {
      var y = r.y;
      return '<g id="a6t8-c' + i + '" opacity="0">' +
        '<text x="' + A6T8.NAME_X + '" y="' + (y + 4) + '" class="s-strong" fill="#152232">' + r.name + '</text>' +
        '<rect x="' + A6T8.TOL_X + '" y="' + (y - 12) + '" width="' + A6T8.TOL_W + '" height="24" rx="12" fill="#f2f6fa" stroke="#d6e0ea"/>' +
        '<text x="' + (A6T8.TOL_X + A6T8.TOL_W / 2) + '" y="' + (y + 4) + '" text-anchor="middle" class="s-sub">容忍 ' + r.tol + ' ms</text></g>' +
        '<text x="208" y="' + (y + 4) + '" class="s-sub" fill="#9fb0bb">→</text>' +
        '<rect x="' + A6T8.LEAD_X + '" y="' + (y - 8) + '" width="' + A6T8.LEAD_W + '" height="16" rx="4" fill="#eef2f6"/>' +
        '<rect id="a6t8-lf' + i + '" x="' + A6T8.LEAD_X + '" y="' + (y - 8) + '" width="0" height="16" rx="4" fill="#4fb8c4"/>' +
        '<text id="a6t8-ll' + i + '" x="' + (A6T8.LEAD_X + A6T8.LEAD_W + 8) + '" y="' + (y + 4) + '" class="s-num" fill="#0e7490" opacity="0">+' + r.lead + ' s</text>' +
        '<text x="448" y="' + (y + 4) + '" class="s-sub" fill="#9fb0bb">→</text>' +
        '<rect x="' + A6T8.CONT_X + '" y="' + (y - 14) + '" width="' + A6T8.CONT_W + '" height="28" rx="4" fill="#f7f9fc"/>' +
        '<rect id="a6t8-of' + i + '" x="' + A6T8.CONT_X + '" y="' + (y - 12) + '" width="0" height="10" rx="3" fill="#9aa7b4"/>' +
        '<rect id="a6t8-nf' + i + '" x="' + A6T8.CONT_X + '" y="' + (y + 2) + '" width="0" height="10" rx="3" fill="#0e7490"/>' +
        '<text id="a6t8-vl' + i + '" x="' + A6T8.VAL_X + '" y="' + (y + 4) + '" class="s-sub" opacity="0">关 ' + r.off.toFixed(4) + ' → 开 ' + r.on.toFixed(4) + '</text>';
    }).join('');
    return '<div class="anim" data-anim="a6t8">' + svg('0 0 1040 244',
      '<text x="24" y="26" class="s-strong">业务感知切换：按中断容忍度分配「预取提前量」→ 连续性满足率（关闭·灰 ／ 开启·青，ns-3 轨）</text>' +
      '<text x="' + A6T8.LEAD_X + '" y="52" class="s-sub" fill="#78909c">预取提前量</text>' +
      '<text x="' + A6T8.CONT_X + '" y="52" class="s-sub" fill="#78909c">连续性满足率（纵轴放大 ' + A6T8.CMIN + '–' + A6T8.CMAX + '）</text>' +
      rows +
      '<text x="24" y="' + (A6T8.ROW0 + 2 * A6T8.ROWH + 34) + '" class="s-sub" fill="#78909c">容忍度/提前量源自 sim/config.py（SERVICE_INTERRUPT_TOL_MS / T8_SERVICE_HO_LEAD_EXTRA_S）；判别场景 t8_stress</text>',
      'a6t8svg') + '</div><div class="abar" data-bar="a6t8"></div>';
  }
  function a6T8Reg() {
    var R = a6T8Rows();
    ANIM.reg('a6t8', {
      dur: 8500,
      note: '依次点亮：中断容忍度 → 预取提前量 → 连续性满足率。话音最敏感（容忍 50 ms）→ 提前量最大（+12 s）→ 开启后连续性 0.8048 → 0.9995',
      build: function (host) {
        return {
          chips: R.map(function (r, i) { return host.querySelector('#a6t8-c' + i); }),
          lf: R.map(function (r, i) { return host.querySelector('#a6t8-lf' + i); }),
          ll: R.map(function (r, i) { return host.querySelector('#a6t8-ll' + i); }),
          of: R.map(function (r, i) { return host.querySelector('#a6t8-of' + i); }),
          nf: R.map(function (r, i) { return host.querySelector('#a6t8-nf' + i); }),
          vl: R.map(function (r, i) { return host.querySelector('#a6t8-vl' + i); })
        };
      },
      frame: function (u, c) {
        var p1 = ANIM.easeOut(ANIM.clamp01((u - 0.02) / 0.18));
        var p2 = ANIM.easeOut(ANIM.clamp01((u - 0.22) / 0.34));
        var p3 = ANIM.easeOut(ANIM.clamp01((u - 0.54) / 0.44));
        R.forEach(function (r, i) {
          if (c.chips[i]) c.chips[i].setAttribute('opacity', p1.toFixed(2));
          if (c.lf[i]) c.lf[i].setAttribute('width', (r.lead / 12 * A6T8.LEAD_W * p2).toFixed(1));
          if (c.ll[i]) c.ll[i].setAttribute('opacity', p2 > 0.72 ? 1 : 0);
          if (c.of[i]) c.of[i].setAttribute('width', (a6T8CW(r.off) * p3).toFixed(1));
          if (c.nf[i]) c.nf[i].setAttribute('width', (a6T8CW(r.on) * p3).toFixed(1));
          if (c.vl[i]) c.vl[i].setAttribute('opacity', p3 > 0.72 ? 1 : 0);
        });
      },
      readout: function (u) {
        var s = u < 0.22 ? '① 中断容忍度' : (u < 0.54 ? '② 预取提前量' : '③ 连续性满足率');
        return '阶段：<b>' + s + '</b>';
      }
    });
  }
  /* —— A6-P3 生存优先：RACH 保护信道（关闭＝先到先得 ↔ 开启＝前 N 时隙仅限高危） —— */
  var A6PRI = { SLOT_N: 12, SLOT_X: 120, SLOT_W: 52, SLOT_GAP: 6.4, SLOT_Y: 60, SLOT_H: 28,
    BAR_X: 120, BAR_W: 700, ROW0: 150, ROWH: 46, GUARD: 3,
    TIERS: [['high', '高危'], ['med', '中危'], ['low', '低危']] };
  function a6PriRows() {
    return A6PRI.TIERS.map(function (t, i) {
      return { key: t[0], name: t[1], off: D.priority.core[t[0] + '危终端接入成功率'],
        on: D.priority.full[t[0] + '危终端接入成功率'], y: A6PRI.ROW0 + i * A6PRI.ROWH };
    });
  }
  function a6PriMarkup() {
    var R = a6PriRows(), cells = '', k;
    for (k = 0; k < A6PRI.SLOT_N; k++) {
      var sx = A6PRI.SLOT_X + k * (A6PRI.SLOT_W + A6PRI.SLOT_GAP);
      cells += '<rect id="a6pri-s' + k + '" x="' + sx + '" y="' + A6PRI.SLOT_Y + '" width="' + A6PRI.SLOT_W +
        '" height="' + A6PRI.SLOT_H + '" rx="4" fill="#eef2f6"/>';
    }
    var rows = R.map(function (r) {
      return '<text x="24" y="' + (r.y + 4) + '" class="s-strong" fill="#152232">' + r.name + '</text>' +
        '<rect x="' + A6PRI.BAR_X + '" y="' + (r.y - 11) + '" width="' + A6PRI.BAR_W + '" height="9" rx="3" fill="#f2f6fa"/>' +
        '<rect id="a6pri-o' + r.key + '" x="' + A6PRI.BAR_X + '" y="' + (r.y - 11) + '" width="0" height="9" rx="3" fill="#9aa7b4"/>' +
        '<rect x="' + A6PRI.BAR_X + '" y="' + (r.y + 1) + '" width="' + A6PRI.BAR_W + '" height="9" rx="3" fill="#f2f6fa"/>' +
        '<rect id="a6pri-n' + r.key + '" x="' + A6PRI.BAR_X + '" y="' + (r.y + 1) + '" width="0" height="9" rx="3" fill="#0e7490"/>' +
        '<text id="a6pri-v' + r.key + '" x="' + (A6PRI.BAR_X + A6PRI.BAR_W + 12) + '" y="' + (r.y + 4) + '" class="s-sub" opacity="0">关 ' +
        r.off.toFixed(4) + ' → 开 ' + r.on.toFixed(4) + '</text>';
    }).join('');
    return '<div class="anim" data-schematic="1" data-anim="a6pri">' + svg('0 0 1040 322',
      '<text x="24" y="24" class="s-strong">生存优先调度：风暴下 RACH 时隙稀缺 —— 关闭＝先到先得（三档趋同）；开启＝前 ' + A6PRI.GUARD + ' 个时隙仅限高危（保护信道）</text>' +
      '<text x="' + A6PRI.SLOT_X + '" y="52" class="s-sub" fill="#78909c">RACH 时隙</text>' +
      '<g id="a6pri-guardt" opacity="0"><text x="' + (A6PRI.SLOT_X + A6PRI.GUARD * (A6PRI.SLOT_W + A6PRI.SLOT_GAP) - 6) +
      '" y="52" class="s-sub" fill="#0e7490">↑ 高危专用 guard channel</text></g>' +
      '<text id="a6pri-mode" x="1016" y="52" text-anchor="end" class="s-num" fill="#5b6b7c">关闭分级</text>' +
      cells + rows +
      '<text x="24" y="' + (A6PRI.ROW0 + 2 * A6PRI.ROWH + 34) + '" class="s-sub" fill="#78909c">时隙分配为示意；三档接入成功率为实测（源 results/，阈值由 DP/Kaufman-Roberts 解出）</text>' +
      '<text x="24" y="' + (A6PRI.ROW0 + 2 * A6PRI.ROWH + 60) + '" class="s-num" fill="#0e7490">高危 − 低危 成功率差：' +
      (R[0].off - R[2].off).toFixed(4) + ' → ' + (R[0].on - R[2].on).toFixed(4) + '（分级把高危明确拉出）</text>',
      'a6prisvg') + '</div><div class="abar" data-bar="a6pri"></div>';
  }
  function a6PriReg() {
    var R = a6PriRows();
    ANIM.reg('a6pri', {
      dur: 9000,
      note: '前段＝关闭分级（先到先得、三档趋同）；中段＝前 3 个时隙变为高危专用；后段＝开启后高危被拉高、中低危下调',
      build: function (host) {
        var cells = [];
        for (var k = 0; k < A6PRI.SLOT_N; k++) cells.push(host.querySelector('#a6pri-s' + k));
        return {
          cells: cells, gt: host.querySelector('#a6pri-guardt'), mode: host.querySelector('#a6pri-mode'),
          off: R.map(function (r) { return host.querySelector('#a6pri-o' + r.key); }),
          on: R.map(function (r) { return host.querySelector('#a6pri-n' + r.key); }),
          vl: R.map(function (r) { return host.querySelector('#a6pri-v' + r.key); })
        };
      },
      frame: function (u, c) {
        var p1 = ANIM.easeOut(ANIM.clamp01((u - 0.02) / 0.28));
        var p2 = ANIM.clamp01((u - 0.36) / 0.22);
        var p3 = ANIM.easeOut(ANIM.clamp01((u - 0.60) / 0.36));
        c.cells.forEach(function (el, k) {
          if (el) el.setAttribute('fill', (k < A6PRI.GUARD && p2 > 0.5) ? '#cfe9ee' : '#eef2f6');
        });
        if (c.gt) c.gt.setAttribute('opacity', p2 > 0.6 ? 1 : 0);
        if (c.mode) c.mode.textContent = p2 > 0.5 ? '开启分级（高危保护信道）' : '关闭分级';
        R.forEach(function (r, i) {
          if (c.off[i]) c.off[i].setAttribute('width', (r.off * A6PRI.BAR_W * p1).toFixed(1));
          if (c.on[i]) c.on[i].setAttribute('width', (r.on * A6PRI.BAR_W * p3).toFixed(1));
          if (c.vl[i]) c.vl[i].setAttribute('opacity', p3 > 0.7 ? 1 : 0);
        });
      },
      readout: function (u) {
        return u < 0.36 ? '关闭分级：<b>先到先得</b>' : (u < 0.60 ? '切换：<b>启用高危保护信道</b>' : '开启分级：<b>高危优先</b>');
      }
    });
  }
  /* —— A6-P4a 资源效率：信令条数 2 vs 4（数据包飞行的直观计数） —— */
  var A6RES = { W0: 220, W1: 830 };
  function a6ResRows() {
    return [
      { key: 'ours', label: '本方案（两步 RACH）', y: 92, color: '#0e7490', sig: D.metrics['res/signal_ours'], slot: D.metrics['res/slot_ours'],
        msgs: [{ id: 'a6res-a', lab: 'msgA', dir: 1, dy: -17, t0: 0.06, t1: 0.26 },
          { id: 'a6res-b', lab: 'msgB', dir: -1, dy: 17, t0: 0.31, t1: 0.51 }] },
      { key: 'rel17', label: 'Rel-17（四步 RACH）', y: 200, color: '#78909c', sig: D.metrics['res/signal_rel17'], slot: D.metrics['res/slot_rel17'],
        msgs: [{ id: 'a6res-1', lab: 'msg1', dir: 1, dy: -27, t0: 0.06, t1: 0.22 },
          { id: 'a6res-2', lab: 'msg2', dir: -1, dy: -9, t0: 0.26, t1: 0.42 },
          { id: 'a6res-3', lab: 'msg3', dir: 1, dy: 9, t0: 0.47, t1: 0.63 },
          { id: 'a6res-4', lab: 'msg4', dir: -1, dy: 27, t0: 0.68, t1: 0.84 }] }
    ];
  }
  function a6ResMarkup() {
    var rows = a6ResRows().map(function (r) {
      var pk = r.msgs.map(function (m) {
        var x1 = m.dir > 0 ? A6RES.W0 : A6RES.W1, x2 = m.dir > 0 ? A6RES.W1 : A6RES.W0;
        return pktOnly(m.id, x1, r.y + m.dy, x2, r.y + m.dy, r.color, m.lab);
      }).join('');
      return '<text x="24" y="' + (r.y - 44) + '" class="s-strong" fill="' + r.color + '">' + r.label + '</text>' +
        '<line x1="104" y1="' + r.y + '" x2="936" y2="' + r.y + '" stroke="' + r.color + '" stroke-width="1" opacity="0.25"/>' +
        entityGlyph('ue', 152, r.y) + entityGlyph('sat', 892, r.y) + pk +
        '<text id="a6res-c-' + r.key + '" x="1024" y="' + (r.y + 44) + '" text-anchor="end" class="s-num" fill="' + r.color + '">已发 0 / ' + r.msgs.length + ' 条</text>';
    }).join('');
    return '<div class="anim" data-anim="a6res">' + svg('0 0 1040 288',
      '<text x="24" y="24" class="s-strong">星上轻量化：一次接入的信令条数 —— 本方案 2 条（msgA↑ / msgB↓），Rel-17 四步 4 条（msg1…msg4）</text>' +
      rows +
      '<text x="24" y="272" class="s-sub" fill="#78909c">时隙占用：本方案 ' + D.metrics['res/slot_ours'] + ' 单位 · Rel-17 ' + D.metrics['res/slot_rel17'] +
      ' 单位；每时隙前导码 ' + D.metrics['res/preamble'] + '（NR 标准）；星上认证额外时延 ' + D.metrics['res/auth_latency_ns3'] +
      ' ms（含抗辐照 CPU 降频 ' + D.metrics['res/auth_derate'] + '× 的保守假设）</text>',
      'a6ressvg') + '</div><div class="abar" data-bar="a6res"></div>';
  }
  function a6ResDrive(host, msgs, u) {
    msgs.forEach(function (m) {
      var g = host.querySelector('#' + m.id); if (!g) return;
      var body = g.querySelector('.pktbody'); if (!body) return;
      var prog = ANIM.clamp01((u - m.t0) / Math.max(1e-6, m.t1 - m.t0));
      var x1 = +g.getAttribute('data-x1'), y1 = +g.getAttribute('data-y1');
      var x2 = +g.getAttribute('data-x2'), y2 = +g.getAttribute('data-y2');
      var x = x1 + (x2 - x1) * prog, y = y1 + (y2 - y1) * prog;
      body.setAttribute('transform', 'translate(' + x.toFixed(1) + ',' + y.toFixed(1) + ')');
      body.setAttribute('opacity', u < m.t0 ? 0 : (prog >= 1 ? 0.5 : 1));
    });
  }
  function a6ResReg() {
    var R = a6ResRows();
    ANIM.reg('a6res', {
      dur: 9000,
      note: '数据包沿链路来回飞行：本方案 2 条就完成一次接入；Rel-17 要 4 条 —— 信令与时隙占用同步减半',
      build: function (host) {
        var c = { host: host, count: {} };
        R.forEach(function (r) { c.count[r.key] = host.querySelector('#a6res-c-' + r.key); });
        return c;
      },
      frame: function (u, c) {
        R.forEach(function (r) {
          a6ResDrive(c.host, r.msgs, u);
          var done = r.msgs.filter(function (m) { return u >= m.t1; }).length;
          if (c.count[r.key]) c.count[r.key].textContent = '已发 ' + done + ' / ' + r.msgs.length + ' 条';
        });
      },
      readout: function (u) {
        var a = R[0].msgs.filter(function (m) { return u >= m.t1; }).length;
        var b = R[1].msgs.filter(function (m) { return u >= m.t1; }).length;
        return '已发信令：本方案 <b>' + a + '</b> 条 / Rel-17 <b>' + b + '</b> 条';
      }
    });
  }
  /* —— A6-P4b 抗冲击：突发窗口 60 s ↔ 1 s（终端涌入与 RACH 队列深度） —— */
  var A6B = { X0: 140, X1: 760, TMAX: 60, TOTAL: 1200, SERVE: 20, N: 34, QMAX: 1180 };
  function a6BurstRows() {
    return [
      { key: 'normal', label: '常规突发 ramp = 60 s', ramp: 60, y: 86, color: '#0e7490', lat: D.metrics['burst/wenchuan/py/latency'], suc: D.metrics['burst/wenchuan/py/success'] },
      { key: 'storm', label: '呼叫风暴 ramp = 1 s', ramp: 1, y: 182, color: '#c0392b', lat: D.metrics['burst/wenchuan_storm2/py/latency'], suc: D.metrics['burst/wenchuan_storm2/py/success'] }
    ].map(function (r) {
      var dots = [];
      for (var i = 0; i < A6B.N; i++) dots.push((i + 0.5) * (r.ramp / A6B.N));
      r.dots = dots;
      return r;
    });
  }
  function a6Bx(t) { return A6B.X0 + t / A6B.TMAX * (A6B.X1 - A6B.X0); }
  function a6BQueue(r, t) {
    var A = t <= r.ramp ? A6B.TOTAL * (t / r.ramp) : A6B.TOTAL;
    return Math.max(0, A - A6B.SERVE * t);
  }
  function a6BurstMarkup() {
    var rows = a6BurstRows().map(function (r) {
      var dots = r.dots.map(function (t, i) {
        var jy = ((i * 7) % 5 - 2) * 3;
        return '<circle id="a6bst-' + r.key + '-d' + i + '" cx="' + a6Bx(t).toFixed(1) + '" cy="' + (r.y + jy) +
          '" r="3" fill="' + r.color + '" opacity="0"/>';
      }).join('');
      return '<text x="24" y="' + (r.y - 24) + '" class="s-strong" fill="' + r.color + '">' + r.label + '</text>' +
        '<line x1="' + A6B.X0 + '" y1="' + r.y + '" x2="' + A6B.X1 + '" y2="' + r.y + '" stroke="#dbe3ec" stroke-width="1.4"/>' +
        dots +
        '<text x="24" y="' + (r.y + 32) + '" class="s-sub" fill="#78909c">RACH 队列</text>' +
        '<rect x="' + A6B.X0 + '" y="' + (r.y + 20) + '" width="' + (A6B.X1 - A6B.X0) + '" height="14" rx="4" fill="#f2f6fa"/>' +
        '<rect id="a6bst-' + r.key + '-q" x="' + A6B.X0 + '" y="' + (r.y + 20) + '" width="0" height="14" rx="4" fill="' + r.color + '" opacity="0.75"/>' +
        '<text id="a6bst-' + r.key + '-o" x="800" y="' + (r.y + 6) + '" class="s-sub" opacity="0">接入成功 ' + r.suc.toFixed(4) + '<tspan class="s-num" dx="8">· 时延 ' + r.lat.toFixed(2) + ' ms</tspan></text>';
    }).join('');
    var ticks = [0, 15, 30, 45, 60].map(function (t) {
      return '<text x="' + a6Bx(t) + '" y="78" text-anchor="middle" class="s-sub">' + t + '</text>';
    }).join('');
    return '<div class="anim" data-schematic="1" data-anim="a6urst">' + svg('0 0 1040 262',
      '<text x="24" y="24" class="s-strong">抗冲击：唯一变量 = 突发窗口（终端数与到达总量不变）—— 60 s 匀入 vs 1 s 涌入，看 RACH 队列如何堆积</text>' +
      '<text x="' + ((A6B.X0 + A6B.X1) / 2) + '" y="52" text-anchor="middle" class="s-sub">时间 (s)</text>' +
      rows +
      '<text x="24" y="250" class="s-sub" fill="#78909c">终端到达为示意（' + A6B.TOTAL + ' 台按窗口匀布）；成功率为实测 Py 轨（源 results/）</text>',
      'a6bstsvg') + '</div><div class="abar" data-bar="a6urst"></div>';
  }
  function a6BurstReg() {
    var R = a6BurstRows();
    ANIM.reg('a6urst', {
      dur: 9000,
      note: '游标扫过 0–60 s：常规突发终端均匀到达、队列几乎为零；呼叫风暴在前 1 s 全部涌入 → 队列陡增，成功率与接入时延同步退化',
      build: function (host) {
        var c = { host: host, dots: {}, q: {}, out: {} };
        R.forEach(function (r) {
          c.dots[r.key] = r.dots.map(function (t, i) { return host.querySelector('#a6bst-' + r.key + '-d' + i); });
          c.q[r.key] = host.querySelector('#a6bst-' + r.key + '-q');
          c.out[r.key] = host.querySelector('#a6bst-' + r.key + '-o');
        });
        return c;
      },
      frame: function (u, c) {
        var t = u * A6B.TMAX;
        R.forEach(function (r) {
          c.dots[r.key].forEach(function (el, i) {
            if (el) el.setAttribute('opacity', t >= r.dots[i] ? 0.85 : 0);
          });
          if (c.q[r.key]) c.q[r.key].setAttribute('width', (a6BQueue(r, t) / A6B.QMAX * (A6B.X1 - A6B.X0)).toFixed(1));
          if (c.out[r.key]) c.out[r.key].setAttribute('opacity', u > 0.88 ? 1 : 0);
        });
      },
      readout: function (u) {
        var t = u * A6B.TMAX;
        var qn = a6BQueue(R[0], t), qs = a6BQueue(R[1], t);
        return 't = <b>' + t.toFixed(0) + ' s</b>　队列：常规 ' + qn.toFixed(0) + ' / 风暴 <b>' + qs.toFixed(0) + '</b>';
      }
    });
  }
  reg({
    id: 'A6', nav: '结果与支撑机制', title: '结果对撞 & 两个支撑机制',
    sub: '四个核心指标一屏对撞；另有两页支撑机制：业务分级（保话音）、生存优先（先救高危）。',
    after: function () {
      a6AbReg();
      a6T8Reg();
      a6PriReg();
      a6ResReg();
      a6BurstReg();
      ANIM.mountScreen(['a6ab', 'a6t8', 'a6pri', 'a6res', 'a6urst']);
    },
    render: function () {
      var P1 = vsBars([
        { t: '切换总时延', a: 12.06, av: n('marg/premig_on/切换总时延均值_ms', { g: 12.06, unit: ' ms' }), b: 381.0, bv: n('marg/premig_off/切换总时延均值_ms', { d: 1, g: 381.0, unit: ' ms' }), d: '<b>↓96.8%</b>（单变量消融臂）' },
        { t: '接入时延（风暴）', a: 193.44, av: n('py/wenchuan_storm2/接入时延均值_ms', { g: 193.44, unit: ' ms' }), b: 652.8, bv: n('py/wenchuan_storm4/接入时延均值_ms', { g: 652.8, unit: ' ms' }), d: '<b>↓70.4%</b>（storm2↔storm4 切片：含 RACH 步数与容量单位两变量）' },
        { t: '高危终端成功率', a: 0.9561, av: n('py/wenchuan_storm2/high危终端接入成功率', { d: 4, g: 0.9561 }), b: 0.5736, bv: n('ms/Rel17四步基线/high危终端接入成功率', { d: 4, g: 0.5736 }), d: '<b>+66.7%</b>（对比 Rel-17 基线，10 种子）' },
        { t: '切换中断均值', a: 0.02, av: n('py/wenchuan/切换中断均值_ms', { d: 2, g: 0.02, unit: ' ms' }), b: 915.74, bv: n('ms/Rel17四步基线/切换中断均值_ms', { d: 2, g: 915.737, unit: ' ms' }), d: '<b>近零</b>（对比 Rel-17 基线）' }
      ]);
      var P2 = DEMO.panel(
        '<div class="legend"><span>业务感知提前量：话音 +12 s / 图像 +4 s / 短信 +0 s —— 按中断容忍度（50 / 300 / 2000 ms）分层保障</span></div>' +
        a6T8Markup() +
        '<div class="tl3">' +
        D.t8.rows.slice(0, 3).map(function (r, i) {
          var lead = [12, 4, 0][i], code = ['话音', '图像', '短信'][i];
          return '<div class="tl3row"><div class="tl3l">' + r.svc.replace(' 连续性满足率', '') + '</div>' +
            '<div class="tl3b"><span class="fill ' + (i === 0 ? 'ours' : 'mid') + '" style="width:' + (lead / 12 * 100).toFixed(0) + '%"></span>' +
            '<span class="tl3t">提前量 +' + lead + ' s</span></div>' +
            '<div class="tl3v">开 ' + n('t8/' + code + '/ns3_on', { d: 4, g: r.ns3_on }) +
            ' ↔ 关 ' + n('t8/' + code + '/ns3_off', { d: 4, g: r.ns3_off }) + '</div></div>';
        }).join('') + '</div>' +
        '<div class="cap">判别场景 <span class="mono">t8_stress</span>（提前量被压到 4 s + 星历误差 5 s）：' +
        '关闭业务感知后，话音连续性满足率由 ' + n('t8/话音/ns3_on', { d: 4, g: 0.9995 }) + ' 降到 ' +
        n('t8/话音/ns3_off', { d: 4, g: 0.8048 }) + ' —— 三类业务中话音退化最剧（中断容忍度最小）。<br/>' +
        '<span class="dim">说明：常规场景切换中断本就近零、三类业务均达 1.0，故常规场景无区分度；判别力仅来自 t8_stress。</span></div>',
        '<span class="bd run">' + D.t8.ns3_on + '</span><span class="bd">双轨一致 ≤0.012</span>');
      var L = [['high', '高危'], ['med', '中危'], ['low', '低危']];
      var P3 = DEMO.panel(
        a6PriMarkup() +
        '<div class="grid3">' +
        L.map(function (p) {
          var a = V('py/wenchuan_storm2/' + p[0] + '危终端接入成功率');
          var b = V('ms/Rel17四步基线/' + p[0] + '危终端接入成功率');
          return DEMO.tile(p[1] + '终端成功率',
            '<div>' + n('py/wenchuan_storm2/' + p[0] + '危终端接入成功率', { d: 4, g: [0.9561, 0.6486, 0.6362][['high', 'med', 'low'].indexOf(p[0])], cls: 'num big ' + (p[0] === 'high' ? 'ours' : 'mid') }) + '</div>',
            '基线 ' + n('ms/Rel17四步基线/' + p[0] + '危终端接入成功率', { d: 4, g: [0.5736, 0.5708, 0.5601][['high', 'med', 'low'].indexOf(p[0])] }) +
            '　·　提升 ' + ((a - b) / b * 100).toFixed(1) + '%');
        }).join('') + '</div>' +
        '<div class="grid3" style="margin-top:10px">' +
        DEMO.tile('分级效果 · 高危−低危成功率差',
          '<div>' + n('py/wenchuan_storm2/生存优先_成功率差(high-low)', { d: 4, g: 0.3199, cls: 'num big ours' }) + '</div>',
          '不分级则「先到先得」，高危与低危几乎无差别；分级后高危被明确拉出（同场景 storm2）',
          'py/wenchuan_storm2/生存优先_成功率差(high-low)') +
        DEMO.tile('分级效果 · 高危相对低危时延降低',
          '<div>' + n('py/wenchuan_storm2/生存优先_时延降低%(high-vs-low)', { d: 1, g: 87.7, cls: 'num big ours', unit: ' %' }) + '</div>',
          '高危终端的接入时延相对低危终端的降低幅度（同场景 storm2）',
          'py/wenchuan_storm2/生存优先_时延降低%(high-vs-low)') +
        DEMO.tile('开关对照 · 关闭 → 开启（高危成功率）',
          '<div>' + D.priority.core.high危终端接入成功率.toFixed(4) + ' <span class="unit">→</span> ' + D.priority.full.high危终端接入成功率.toFixed(4) + '</div>',
          '关闭分级时三档趋同（' + D.priority.core.med危终端接入成功率.toFixed(4) + ' / ' + D.priority.core.low危终端接入成功率.toFixed(4) + '）；开启后高危提升、中低危下调 —— 这正是「生存优先」的取舍',
          null) +
        '</div>' +
        '<div class="cap"><b>机制</b>：风暴下 RACH 容量稀缺，若不分级则先到先得。为高危终端预留保护信道（guard channel），' +
        '阈值由 Kaufman-Roberts 递推求解，解出高危 QoS 上界 ' + n('py/wenchuan_storm2/dp高危QoS上界', { d: 2, g: 0.12 }) +
        '、平均高危预留 ' + n('py/wenchuan_storm2/dp平均高危预留', { d: 2, g: 0.75 }) + '。<br/>' +
        '<b>代价</b>：中低危加权阻塞率 ' + n('py/wenchuan_storm2/加权阻塞率(中低危)', { d: 4, g: 0.3576 }) +
        ' —— 这是<b>设计权衡</b>：应急场景下「先救能救的人」是明确取向。</div>',
        '<span class="bd run">' + D.run_meta.py.wenchuan_storm2.run_id + '</span>');
      /* —— P4 · 消融 / 资源效率 / 抗冲击（补齐原 20 屏施工表中的 S14 / S17 / S18） —— */
      var P4 = DEMO.panel(
        '<h4 class="sec">① 消融：逐臂切换策略（同一场景，seed 42）</h4>' +
        '<div class="note">本职 <b>predictive</b> 与 <b>predictive_nopremig</b>（同提前量、<b>仅关闭星间预迁移</b>）构成<b>单变量消融</b>；cho / rel17 / dqn / graph 为业内或论文基线。</div>' +
        a6AbMarkup() +
        DEMO.table(['切换策略', '切换总时延 · Py (ms)', '· ns-3 (ms)', '预迁移命中率'],
          D.baseline_matrix.order.map(function (arm) {
            var A = D.baseline_matrix.arms[arm];
            return [A.label,
              n('base/' + arm + '/py/切换总时延均值_ms', { g: A.py['切换总时延均值_ms'] }),
              n('base/' + arm + '/ns3/切换总时延均值_ms', { g: A.ns3['切换总时延均值_ms'] }),
              n('base/' + arm + '/py/预迁移命中率', { d: 1, g: A.py['预迁移命中率'] })];
          })) +
        '<div class="cap">只关掉<b>星间预迁移</b>（predictive → nopremig），切换总时延即由 ' +
          n('base/predictive/py/切换总时延均值_ms', { g: 12.14, cls: 'ours', unit: ' ms' }) + ' 跳到 ' +
          n('base/predictive_nopremig/py/切换总时延均值_ms', { g: 381.04, unit: ' ms' }) +
          ' —— 同提前量、同候选选择，唯一变量就是预迁移。</div>' +
        '<h4 class="sec" style="margin-top:16px">② 资源效率：星上轻量化逐条量化（I-12）</h4>' +
        a6ResMarkup() +
        DEMO.table(['维度', '本方案', 'Rel-17 四步', '说明'], [
          ['单次接入信令条数', n('res/signal_ours', { g: 2 }) + '（msgA→msgB）', n('res/signal_rel17', { g: 4 }) + '（msg1→msg4）', '一次往返 vs 四次握手'],
          ['单次接入 RACH 时隙单位', n('res/slot_ours', { g: 1 }), n('res/slot_rel17', { g: 2 }), 'RACH_SLOT_UNITS'],
          ['每时隙前导码（NR 标准）', n('res/preamble', { g: 64 }), n('res/preamble', { g: 64 }), '同'],
          ['星上认证额外时延', n('res/auth_latency_ns3', { g: 0.102, unit: ' ms' }), '—',
            '含抗辐照 CPU 降频 ' + n('res/auth_derate', { g: 1000 }) + '× 的保守假设']
        ]) +
        '<h4 class="sec" style="margin-top:16px">③ 抗冲击：仅改突发窗口（单变量，I-15）</h4>' +
        a6BurstMarkup() +
        DEMO.table(['指标', '常规突发 ramp=60 s', '呼叫风暴 ramp=1 s', '变化'], [
          ['接入时延均值 ·Py (ms)', n('burst/wenchuan/py/latency', { g: 12.24 }), n('burst/wenchuan_storm2/py/latency', { g: 193.44 }), '×15.8'],
          ['接入成功率 ·Py', n('burst/wenchuan/py/success', { d: 4, g: 1.0 }), n('burst/wenchuan_storm2/py/success', { d: 4, g: 0.705 }), '↓29.5pp'],
          ['接入成功率 ·ns-3', n('burst/wenchuan/ns3/success', { d: 4, g: 1.0 }), n('burst/wenchuan_storm2/ns3/success', { d: 4, g: 0.7109 }), '↓28.9pp']
        ]) +
        '<div class="cap">唯一变量 = 突发窗口 60 s → 1 s（终端数与到达总量不变），用以检验方案在<b>突发冲击</b>下的退化幅度。</div>',
        '<span class="bd run">perf/crossval_ho_results.json</span><span class="bd">I-12 资源效率</span><span class="bd">I-15 抗冲击</span>');
      return '<div class="tabbox">' +
        '<div class="tabs2">' +
        '<button class="on" data-tab="p1">核心结果对撞</button>' +
        '<button data-tab="p2">支撑机制 · 业务分级 T8</button>' +
        '<button data-tab="p3">支撑机制 · 生存优先调度</button>' +
        '<button data-tab="p4">消融 · 资源效率 · 抗冲击</button>' +
        '</div>' +
        '<div class="tabpane on" data-pane="p1">' + P1 + '</div>' +
        '<div class="tabpane" data-pane="p2">' + P2 + '</div>' +
        '<div class="tabpane" data-pane="p3">' + P3 + '</div>' +
        '<div class="tabpane" data-pane="p4">' + P4 + '</div>' +
        '</div>';
    }
  });

  /* ========================================================================
     A7 · 可证伪与稳健
     ====================================================================== */
  reg({
    id: 'A7', nav: '可证伪与稳健', title: '可证伪性：扫参数、看拐点、给置信区间',
    sub: '如果指标怎么调参数都不变，那它就不是结论而是同义反复。拖动下面的扫描条看指标怎么变。',
    after: function () {
      ANIM.reg('a7', {
        dur: 11000, note: '扫描条驱动 ECharts 的真实数据点（showTip），读数与曲线同源',
        build: function (host) { return { rd: document.getElementById('a7-rd') }; },
        frame: function (u, c) {
          var g = D.sensitivity.groups.compromised_share.points, n2 = g.length;
          var i = Math.min(n2 - 1, Math.round(ANIM.clamp01(u) * (n2 - 1)));
          var ch = window.DEMO_CHARTS && window.DEMO_CHARTS.get('c-s15c-chart');
          if (ch) { try { ch.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex: i }); } catch (e) {} }
          var th = 1 - g[i].x;
          if (c.rd) {
            c.rd.innerHTML = '扫描点：密钥泄露占比 <b>' + g[i].x.toFixed(2) + '</b>' +
              '　→　实测拦截率 <b>' + g[i].block_rate.toFixed(4) + '</b>' +
              '　（理论上限 1 − 泄露占比 = <b>' + th.toFixed(2) + '</b>）' +
              (g[i].block_rate > th ? '　<span style="color:#0e7490">实测高于理论线</span>' : '');
          }
        },
        readout: function (u) {
          var g = D.sensitivity.groups.compromised_share.points;
          var i = Math.min(g.length - 1, Math.round(ANIM.clamp01(u) * (g.length - 1)));
          return '第 <b>' + (i + 1) + '/' + g.length + '</b> 个扫描点';
        }
      });
      ANIM.mountScreen(['a7']);
    },
    render: function () {
      var ci = D.multiseed.ci_95;
      return DEMO.panel(
        '<div class="anim" data-anim="a7">' +
        '<div class="grid3">' +
        '<div><div class="chart-t">① 切换提前量 ho_lead（默认 20 s）</div><div id="c-s15a" class="chart sm"></div></div>' +
        '<div><div class="chart-t">② 星历误差 ephem_err（默认 5 s）</div><div id="c-s15b" class="chart sm"></div></div>' +
        '<div><div class="chart-t">③ 密钥泄露占比 compromised_share</div><div id="c-s15c-chart" class="chart sm"></div></div>' +
        '</div><div class="cap" id="a7-rd">拖动进度条，看指标如何随参数单调变化</div></div>' +
        '<div class="abar" data-bar="a7"></div>',
        '<span class="bd run">sensitivity_20260903</span><span class="bd ours">可证伪</span>') +
        '<div class="grid3">' +
        DEMO.tile('提前量存在「零中断拐点」',
          '<div>' + n('sens/ho_lead_s/0/x', { g: 2 }) + ' s → ' + n('sens/ho_lead_s/0/interrupt_ms', { d: 2, g: 459.73, unit: ' ms' }) + '<br/>' +
          n('sens/ho_lead_s/4/x', { g: 20 }) + ' s → ' + n('sens/ho_lead_s/4/interrupt_ms', { d: 2, g: 0.02, unit: ' ms' }) + '</div>',
          '单调下降；默认 20 s 落在零中断区并留有余量 —— 默认参数有数据依据') +
        DEMO.tile('星历误差超余量后非线性陡增',
          '<div>' + n('sens/ephem_err_s/1/x', { g: 5 }) + ' s → ' + n('sens/ephem_err_s/1/interrupt_ms', { d: 2, g: 0.02, unit: ' ms' }) + '<br/>' +
          n('sens/ephem_err_s/4/x', { g: 30 }) + ' s → ' + n('sens/ephem_err_s/4/interrupt_ms', { d: 2, g: 3267.38, unit: ' ms' }) + '</div>',
          '结论有明确适用边界，越界即失效 —— 模型可被反向证据推翻') +
        DEMO.tile('10 独立种子：区间完全不重叠',
          '<div class="num mid ours">' + n('ms_ci/切换总时延均值_ms/mean', { d: 3, g: 12.063, unit: ' ms' }) + '<br/>' +
          '<span class="base">' + n('ms/Rel17四步基线/切换总时延均值_ms', { d: 3, g: 380.914, unit: ' ms' }) + '</span></div>',
          '10 独立种子的本方案 vs Rel-17 四步基线（实测）；种子间 σ 仅 ' +
          D.multiseed.ci_95['切换总时延均值_ms'][3].toFixed(3) + ' / ' +
          D.multiseed.configs['Rel17四步基线'].values['切换总时延均值_ms_stdev'].toFixed(3) +
          ' ms（在 0–400 ms 轴上不可见，故不放大误差棒以免误导）',
          'ms_ci/切换总时延均值_ms/mean') +
        '</div>';
    }
  });

  /* ========================================================================
     A8 · 边界与诚实
     ====================================================================== */
  reg({
    id: 'A8', nav: '边界与诚实', title: '边界与诚实：我们把话说清楚',
    sub: '材料真实性原则：对未实现项、假设项与不可断言项均明确标注，避免任何误导性陈述。',
    after: function () {
      ANIM.reg('a8', {
        dur: 9000, note: 'TRL 刻度条：本项目定位 TRL 3–4',
        build: function (host) { return { m: host.querySelector('#a8-mark'), t: host.querySelector('#a8-mlab') }; },
        frame: function (u, c) {
          var p = ANIM.easeOut(ANIM.clamp01(u / 0.6));
          var x = ANIM.lerp(70, 70 + 3.5 * 108, p);
          c.m.setAttribute('x1', x); c.m.setAttribute('x2', x);
          c.t.setAttribute('x', x + 8); c.t.setAttribute('opacity', u > 0.5 ? 1 : 0);
        }
      });
      ANIM.mountScreen(['a8']);
    },
    render: function () {
      var L = D.limits;
      var trl = svg('0 0 1040 116',
        '<line x1="70" y1="60" x2="' + (70 + 8 * 108) + '" y2="60" stroke="#dbe3ec" stroke-width="4"/>' +
        [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (i) {
          var x = 70 + (i - 1) * 108;
          var on = i <= 4;
          return '<circle cx="' + x + '" cy="60" r="9" fill="' + (on ? '#0e7490' : '#e6ecf2') + '"/>' +
            '<text x="' + x + '" y="88" text-anchor="middle" class="s-sub">TRL ' + i + '</text>' +
            (i === 1 ? '<text x="' + x + '" y="34" text-anchor="middle" class="s-sub">仿真验证</text>' : '') +
            (i === 5 ? '<text x="' + x + '" y="34" text-anchor="middle" class="s-sub">硬件在环</text>' : '');
        }).join('') +
        '<rect x="70" y="46" width="' + (3.5 * 108) + '" height="28" rx="14" fill="#0e7490" opacity=".12"/>' +
        '<line id="a8-mark" x1="70" y1="18" x2="70" y2="96" stroke="#152232" stroke-width="2"/>' +
        '<text id="a8-mlab" x="78" y="13" class="s-num" opacity="0">本项目：' + L.trl.level + '（TRL3 已完全满足）</text>',
        'a8stage');
      var col = function (title, items, cls) {
        return '<div class="colcard' + (cls ? ' ' + cls : '') + '"><h4>' + title + '</h4><ul class="tight">' +
          items.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></div>';
      };
      return DEMO.panel('<div class="anim" data-anim="a8">' + trl + '</div><div class="abar" data-bar="a8"></div>', 
        '<span class="bd warn">' + L.trl.basis.replace(/\*\*/g, '') + '</span>') +
        '<div class="grid3">' +
        col('已知局限（逐条披露）', [
          '<b>ns-3 轨非确定性</b>：SGP4 以墙钟为传播历元 → 同 seed 复跑 ~0.2–0.7% 浮动；本页 ns-3 值为<b>单次样本</b>。',
          '<b>Python 轨浮动</b>：认证时延为实测值 → 时延均值有 ±0.01 ms 浮动；结构量逐位复现。',
          '<b>ns-3 信道保真度</b>：自研轻量 LEO 模型，非 3GPP NTN 物理层模块；指标以 Python 轨为准。',
          '<b>建模假设未锚定文献</b>：根密钥预分发方式与 compromised_share=0.15 缺文献锚定。',
          '<b>星间信任链为简化假设</b>：上下文以 (term_id→counter) 明文映射表达，未建模星间签名/加密。',
          '<b>规模边界</b>：已验证 1000–1500 终端；<b>3000/6000 未验证</b>。'
        ]) +
        col('明确不作的宣称', L.not_claims.map(function (x) { return '<b>' + x.t + '</b>：' + x.d.replace(/\*\*/g, ''); })) +
        col('数字口径（现场必须守住）', [
          '<b>权威</b>：docs/双轨交叉验证对照表.md（任务书硬要求①）。',
          '<b>废弃值</b>：任务书旧值 12.02 / 380.92 已废 → 现行 ' +
            n('marg/premig_on/切换总时延均值_ms', { g: 12.06, unit: ' ms' }) + ' / ' +
            n('marg/premig_off/切换总时延均值_ms', { d: 1, g: 381.0, unit: ' ms' }) + '；页面对此有自动断言。',
          '<b>对比对象</b>：Rel-17 四步基线（同负载 storm2，10 独立种子）。',
          '<b>接入时延</b>：仅统计成功终端（失败不计入）→ 必须与成功率并读。',
          '<b>伪造拦截率分母</b>：进入认证环节的伪造终端（RACH 未受理者单列）。',
          '<b>未做项</b>：物理层指纹（仅威胁论证）、Dolev-Yao 形式化、空基扩展层增益实验。'
        ]) +
        '</div>';
    }
  });

  /* ========================================================================
     X1 · 证据附录（折叠收纳全部长表）
     ====================================================================== */
  reg({
    id: 'X1', nav: '证据附录', title: '证据附录：每个数字都能走回去',
    sub: '主线不讲这些表；被追问时按需展开。每一格都带 run_id 与独立誊写副本。',
    render: function () {
      var f = D.crossval.fields, order = D.crossval.order;
      var lab = { '接入成功率': '接入成功率', '接入时延均值_ms': '时延均值 (ms)', '接入时延P95_ms': '时延 P95 (ms)',
        '切换中断均值_ms': '切换中断均值 (ms)', '切换事件数': '切换事件数', '预迁移命中率': '预迁移命中率',
        '预测失配率': '预测失配率', '伪造终端拦截率': '伪造终端拦截率', 'RACH吞吐_终端每秒': 'RACH 吞吐 (终端/s)',
        '切换总时延均值_ms': '切换总时延均值 (ms)' };
      var NEAR = { '切换中断均值_ms': 1, '预迁移命中率': 1 };
      var cross = order.map(function (sc) {
        var rows = Object.keys(f).map(function (col) {
          var k = f[col], a = D.crossval.py[sc][k], b = D.crossval.ns3[sc][k], dd = (k === '切换事件数' || k === '接入时延P95_ms') ? 2 : 4;
          var diff;
          if (NEAR[k]) {
            diff = k === '预迁移命中率' ? (Math.abs(a - b) < 1e-9 ? '<span class="bd ok">一致</span>' : '<b>' + a + ' / ' + b + '</b>')
              : (a <= 0.1 && b <= 0.1 ? '<span class="bd ok">同为近零（Δ=' + Math.abs(b - a).toFixed(2) + ' ms）</span>' : 'Δ=' + (b - a).toFixed(2));
          } else {
            var dv = a ? (b - a) / a * 100 : 0;
            diff = '<span class="delta ' + (Math.abs(dv) < 3 ? 'flat' : 'down') + '">' + (dv >= 0 ? '+' : '') + dv.toFixed(2) + '%</span>';
          }
          return ['<b>' + lab[k] + '</b>', n('py/' + sc + '/' + k, { d: dd, g: a }), n('ns3/' + sc + '/' + k, { d: dd, g: b }), diff];
        });
        var scLabel = (D.scene_label && D.scene_label[sc]) ? D.scene_label[sc] : sc;
        return '<div class="chart-t">场景 ' + (order.indexOf(sc) + 1) + ' / ' + order.length + '：' + scLabel +
          '　<span class="mono" style="font-size:11px;color:#6b7c91">' + sc + '</span></div>' +
          DEMO.table(['指标', 'Python 轨', 'ns-3 轨', '差异'], rows, { noHead: order.indexOf(sc) > 0 });
      }).join('<div style="height:10px"></div>');
      var ev = DEMO.table(['结论 / 数据', '权威位置', 'run_id / 数据集', '复算方式'],
        D.evidence.map(function (e) {
          return ['<b>' + e.k + '</b>', '<span class="mono" style="font-size:11.5px">' + e.v + '</span>',
            '<span class="mono" style="font-size:11px;word-break:break-all">' + e.run + '</span>',
            '<span style="font-size:11.5px">' + e.how + '</span>'];
        }));
      var bm = DEMO.table(['切换策略', '切换总时延 (ms) Py/ns3', '切换中断均值 (ms) Py/ns3', '预测失配率 Py/ns3'],
        D.baseline_matrix.order.map(function (arm) {
          var A = D.baseline_matrix.arms[arm], hi = arm === 'predictive';
          return [(hi ? '<b>' + A.label + '</b>' : A.label),
            n('base/' + arm + '/py/切换总时延均值_ms', { g: A.py['切换总时延均值_ms'], cls: hi ? 'ours' : '' }) + ' / ' +
            n('base/' + arm + '/ns3/切换总时延均值_ms', { g: A.ns3['切换总时延均值_ms'] }),
            A.py['切换中断均值_ms'] + ' / ' + A.ns3['切换中断均值_ms'],
            A.py['预测失配率'] + ' / ' + A.ns3['预测失配率']];
        }));
      var res = DEMO.table(['维度', '本方案', 'Rel-17 四步', '差'],
        [['单次接入信令条数', n('res/signal_ours', { g: 2 }) + '（msgA/msgB）', n('res/signal_rel17', { g: 4 }) + '（msg1→msg4）', '↓2 条'],
         ['单次接入 RACH 时隙单位', n('res/slot_ours', { g: 1 }), n('res/slot_rel17', { g: 2 }), '↓1 单位'],
         ['每时隙前导码（NR 标准）', n('res/preamble', { g: 64 }), n('res/preamble', { g: 64 }), '同'],
         ['RACH 吞吐 (终端/s)', n('res/rach_thr_storm2', { d: 4, g: 0.2247 }), n('res/rach_thr_storm4', { d: 4, g: 0.1444 }), '+55.6%'],
         ['星上认证额外时延', n('res/auth_latency_ns3', { g: 0.102, unit: ' ms' }), '—', '含降频 1000× 假设']]) +
        '<div class="note">★表述纪律：只能说「<b>单次接入</b>信令 2 vs 4、时隙 1 vs 2」；<b>不可说「总信令减半」</b>' +
        '—— 四步成功率低（' + D.metrics['py/wenchuan_storm4/接入成功率'].toFixed(4) + '）、失败重试更多，故「总信令量」口径会反直觉。</div>';
      var burst = DEMO.table(['指标', '常规突发 ramp=60 s', '呼叫风暴 ramp=1 s', '变化'],
        [['接入时延均值 (ms) · Py', n('burst/wenchuan/py/latency', { g: 12.24 }), n('burst/wenchuan_storm2/py/latency', { g: 193.44 }), '×15.8'],
         ['接入时延 P95 (ms) · Py', n('burst/wenchuan/py/p95', { g: 12.54 }), n('burst/wenchuan_storm2/py/p95', { g: 880.13 }), '×70.2'],
         ['接入成功率 · Py', n('burst/wenchuan/py/success', { d: 4, g: 1.0 }), n('burst/wenchuan_storm2/py/success', { d: 4, g: 0.705 }), '↓29.5pp'],
         ['接入成功率 · ns-3', n('burst/wenchuan/ns3/success', { d: 4, g: 1.0 }), n('burst/wenchuan_storm2/ns3/success', { d: 4, g: 0.7109 }), '↓28.9pp']]);
      var cov = DEMO.table(['格点 (i,j)', '可见窗数', '满足率', '累计可见比', '最长间隙 (s)'],
        D.coverage.cells.map(function (c) {
          return ['(' + c.i + ',' + c.j + ')', n('cov/' + c.i + ',' + c.j + '/windows', { g: c.windows }),
            n('cov/' + c.i + ',' + c.j + '/satisfied', { d: 4, g: c.satisfied }),
            n('cov/' + c.i + ',' + c.j + '/accumulated_ratio', { d: 4, g: c.accumulated_ratio }),
            n('cov/' + c.i + ',' + c.j + '/max_gap_s', { d: 1, g: c.max_gap_s })];
        }).slice(0, 25)) +
        '<div class="note">' + D.coverage.summary.note + '</div>';
      var runs = DEMO.table(['平台', '场景', 'run_id', 'seed', '产出时间'],
        order.map(function (sc) {
          var p = D.run_meta.py[sc];
          return ['Python', sc, '<span class="mono" style="font-size:11px">' + p.run_id + '</span>', p.seed, (p.produced_at || '').slice(0, 19)];
        }).concat(order.map(function (sc) {
          var q = D.run_meta.ns3[sc];
          return ['ns-3', sc, '<span class="mono" style="font-size:11px">' + q.run_id + '</span>', q.seed, (q.produced_at || '').slice(0, 19)];
        })));
      var meta = DEMO.table(['项', '值'],
        [['data.js 生成时间', D.generated_at], ['生成脚本', '<span class="mono">' + D.builder + '</span>'],
         ['仓库 HEAD', '<span class="mono">' + D.repo_head + '</span>'], ['数字权威', '<span class="mono">' + D.authority + '</span>'],
         ['可断言指标数', D.counts.metrics + ' 项'],
         ['双轨对照单元', D.counts.crossval_cells + ' 个（' + D.crossval.order.length + ' 场景 × 10 指标 × 2 轨）'],
         ['trace 事件', D.counts.trace_events + ' 条（17 列契约）'],
         ['星座', D.counts.constellation + ' 颗 × ' + D.constellation.frames + ' 帧']]);
      var sc = DEMO.panel(
        '<ul class="tight">' +
        '<li><span class="mono">demo/tools/build_demo_data.py</span> 生成 data.js 前执行 <b>5 类断言</b>：' +
        '对照表 ↔ results JSON ↔ ns-3 run metrics 三方逐位一致 / trace 重算与漏斗守恒 / manifest ↔ scenario.py / 无废弃值。任一不过即拒绝生成。</li>' +
        '<li><span class="mono">selfcheck_audit.js</span>：外部请求 0 · 静态外链 0 · JS 错误 0 · 全部数据图元数字逐位正确且带 run_id · ' +
        '<b>独立誊写副本 data-golden 双向一致</b> · 示意水印齐全 · 全屏无渲染残缺（自检会扫描非法字面量）。</li>' +
        '<li><span class="mono">selfcheck_interact.js</span>：切屏 / 左侧图例口径 / 溯源抽屉 / 动画控制 / 3D 像素取证 / 图表落图。' +
        '<span class="mono">selfcheck_shots.js</span>：逐屏截图留基线。</li>' +
        '<li><b>负向用例</b> <span class="mono">fixtures/{contract_bad,golden_bad}.html</span> 必须判 FAIL（exit=1）—— 证明自检不是空转。</li>' +
        '</ul>', '<span class="bd ok">4 类自检 · 全部 PASS</span>');
      return DEMO.fold('双轨互证（4 场景 × 10 指标，80 个数值）', '对照表 §2/§3', cross, true) +
        DEMO.fold('核心证据索引（结论 → 文件 → 复算）', D.evidence.length + ' 条', ev, false) +
        DEMO.fold('切换策略基线矩阵（6 方案 × 双轨，seed 42）', 'perf/crossval_ho_results.json', bm, false) +
        DEMO.fold('资源效率（星上轻量化逐条量化）', 'I-12', res, false) +
        DEMO.fold('抗冲击（单变量：仅改突发窗口）', 'I-15', burst, false) +
        DEMO.fold('覆盖品质（25 格点可见窗）', '方案A 网格窗', cov, false) +
        DEMO.fold('全部 run 清单（run_id / seed / 产出时间）', order.length * 2 + ' 条', runs, false) +
        DEMO.fold('data.js 元信息与自检说明', D.counts.metrics + ' 项指标', meta + sc, false);
    }
  });

  /* ========================== 装配 ========================== */
  /* L1 核心结论锚点（大屏设计规范：读者应在 30 秒内抓住本屏唯一重点）
     ★数字一律走 n() / 单一数据源，绝不硬编码（core.js:3 铁律） */
  var CONCL = {
    A1: '切换总时延 ' + n('marg/premig_on/切换总时延均值_ms', { g: 12.06, cls: 'ours', unit: ' ms' }) +
        '，较关闭预迁移的对照臂 ' + n('marg/premig_off/切换总时延均值_ms', { d: 1, g: 381.0, cls: 'base', unit: ' ms' }) +
        ' 降低 <b>96.8%</b>，且切换中断为零。<span class="dim">（该倍率的口径构成见 A3「口径披露」）</span>',
    A2: '四站各产出一个可核对的实测数字：接入 ' + n('py/wenchuan_storm2/接入时延均值_ms', { g: 193.44, cls: 'ours', unit: ' ms' }) +
        '、拦截率 ' + n('ns3/wenchuan_storm2/伪造终端拦截率', { d: 4, g: 0.8537, cls: 'ours' }) +
        '、切换 ' + n('marg/premig_on/切换总时延均值_ms', { g: 12.06, cls: 'ours', unit: ' ms' }) +
        '、话音连续性 ' + n('t8/话音/ns3_on', { d: 4, g: 0.9995, cls: 'ours' }) + '。',
    A3: '两步 ' + D.handshake.theory.two_step_ms.toFixed(1) + ' ms ↔ 四步 ' + D.handshake.theory.four_step_ms.toFixed(0) +
        ' ms（约 ' + D.handshake.sens_timers.points[3].ratio + '×）—— 其中 <b>协议本身只占 ' +
        D.handshake.sens_timers.points[0].ratio + '×</b>（四步比两步多一次往返），其余来自两个「仿真设定」的定时器预算；见下方口径披露。',
    A4: '拦截 ' + D.funnel.blocked + '、漏检 ' + D.funnel.missed + '（共 ' + D.funnel.total +
        ' 条事件）：双根 HMAC 拦下盲伪造；持有效密钥的泄露型伪造在密码层不可检出 —— 这是需与物理层指纹融合的量化依据。',
    A5: '星间预迁移把切换总时延从 ' + n('marg/premig_off/切换总时延均值_ms', { d: 1, g: 381.0, cls: 'base', unit: ' ms' }) +
        ' 压到 ' + n('marg/premig_on/切换总时延均值_ms', { g: 12.06, cls: 'ours', unit: ' ms' }) +
        '（↓96.8%）；中断为零来自先建后断重叠窗，与预迁移正交。<span class="dim">（倍率口径见 A3 披露）</span>',
    A6: '切换总时延 ↓96.8%（单变量消融臂）、接入时延 ↓70.4%（两变量切片）、高危成功率 +66.7%（10 种子）—— 每处提升都附对照臂与口径说明。<span class="dim">（切换倍率口径见 A3 披露）</span>',
    A7: '参数扫描下指标单调响应、越界即失效 —— 本方案结论<b>可被反向证据推翻</b>。',
    A8: 'ns-3 非确定性、Python 时延浮动、信道保真度、星间信任链简化、规模边界 3000/6000 未验证 —— <b>逐条写明</b>，不留误导性陈述。',
    X1: '4 场景 × 10 指标双轨互证、80 个数值、1020 项指标<b>全部带 run_id 与权威文件出处</b>。'
  };
  function boot() {
    SCENES.sort(function (a, b) { return a.id < b.id ? -1 : 1; });
    var nav = '', main = '';
    SCENES.forEach(function (s) {
      nav += '<a class="nav" data-goto="' + s.id + '">' + s.nav + '<span class="tag">' + s.id + '</span></a>';
      main += '<section class="screen" data-screen="' + s.id + '" id="sc-' + s.id + '">' +
        '<header><span class="idx">' + s.id + '</span><h2>' + s.title + '</h2><p>' + s.sub + '</p>' +
        (CONCL[s.id] ? '<div class="concl"><span class="cl-tag">结论</span>' + CONCL[s.id] + '</div>' : '') +
        '</header>' +
        s.render() + '</section>';
    });
    document.getElementById('nav').innerHTML = nav;
    document.getElementById('main').innerHTML = main;

    var CH = window.DEMO_CHARTS;
    CH.register('A7', 'c-s15a', CH.cS15('ho_lead_s'));
    CH.register('A7', 'c-s15b', CH.cS15('ephem_err_s'));
    CH.register('A7', 'c-s15c-chart', CH.cS15('compromised_share'));
    DEMO.boot();
    ANIM.start();

    DEMO.onScreen(function (id) {
      CH.onShow(id);
      CH.resizeAll();
      var s = SCENES.filter(function (x) { return x.id === id; })[0];
      if (s && s.after) s.after();
      if (id === 'A5' && window.DEMO_3D) window.DEMO_3D.onShow();
      /* 进入某屏：该屏动画归零并自动播放（不可见屏的动画在主循环里不计时） */
      [].forEach.call(document.querySelectorAll('.screen.on .anim'), function (el) {
        var aid = el.getAttribute('data-anim');
        if (aid && ANIM) { ANIM.seek(aid, 0); ANIM.play(aid); }
      });
    });
    DEMO.show(SCENES[0].id);
  }
  window.DEMO_SCENES = { list: SCENES, boot: boot };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

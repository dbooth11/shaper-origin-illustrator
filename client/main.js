/*
 * main.js — Shaper Output panel UI logic.
 * The panel is just chrome; every real action runs in the ExtendScript host
 * (host/shaper-core.jsxinc) via CSInterface.evalScript. Degrades gracefully when
 * opened outside Illustrator (e.g. a browser) so the layout can be previewed.
 */
(function () {
  'use strict';

  // CEP injects window.__adobe_cep__; the CSInterface class alone also loads in a
  // plain browser, so detect the actual host bridge (lets the panel preview safely).
  var inCEP = (typeof window !== 'undefined' && typeof window.__adobe_cep__ !== 'undefined');
  var cs = inCEP ? new CSInterface() : null;

  // Follow Illustrator's UI brightness via appSkinInfo. The host exposes the
  // panel background RGB; we derive lightness and flip CSS variables so the
  // panel stays legible in both Illustrator's dark and light UI themes.
  if (inCEP) {
    try {
      var env = JSON.parse(cs.getHostEnvironment());
      var skin = env && env.appSkinInfo;
      if (skin) {
        var rgb = skin.panelBackgroundColor && skin.panelBackgroundColor.color;
        if (rgb) {
          var L = (rgb.red * 0.299 + rgb.green * 0.587 + rgb.blue * 0.114) / 255;
          var r = document.documentElement;
          if (L > 0.5) {
            // Light UI
            r.style.setProperty('--bg',         '#f0f0f0');
            r.style.setProperty('--surface',     '#e4e4e4');
            r.style.setProperty('--surface-hi',  '#d8d8d8');
            r.style.setProperty('--field',       '#ffffff');
            r.style.setProperty('--border',      '#c0c0c0');
            r.style.setProperty('--border-hi',   '#a8a8a8');
            r.style.setProperty('--text',        '#1e1e1e');
            r.style.setProperty('--dim',         '#505050');
            r.style.setProperty('--hint',        '#707070');
            r.style.setProperty('--on-accent',   '#ffffff');
          }
        }
      }
    } catch (e) { /* skin detection is best-effort */ }
  }

  var statusEl = document.getElementById('status');

  function setStatus(msg, kind) {
    statusEl.textContent = msg;
    statusEl.className = 'status' + (kind ? ' ' + kind : '');
  }

  // Run a host function; result string is "OK:n" / "CLEARED:n" / a message.
  function host(call, onResult) {
    if (!inCEP) {
      setStatus('(preview) would call: ' + call, null);
      return;
    }
    cs.evalScript(call, function (res) { onResult(res == null ? '' : String(res)); });
  }

  function reportCount(res, verbPast, noun) {
    if (res.indexOf('OK:') === 0) {
      setStatus(verbPast + ' ' + res.slice(3) + ' ' + noun + '.', 'ok');
    } else if (res.indexOf('CLEARED:') === 0) {
      setStatus('Cleared depth on ' + res.slice(8) + ' ' + noun + '.', 'ok');
    } else {
      setStatus(res, 'err');
    }
  }

  // ── Selection watcher — highlight cut type + populate depth when a tagged path is selected ──
  var _activeCut = null;
  var _selectionKey = null;
  var depthInput = document.getElementById('depthVal');
  var depthUnit = document.getElementById('depthUnit');
  var editingDepth = false;

  depthInput.addEventListener('input', function () {
    editingDepth = true;
  });

  depthUnit.addEventListener('change', function () {
    editingDepth = true;
  });

  function setDepthField(value, unit) {
    if (value) {
      if (!editingDepth) {
        depthInput.value = value;
        depthUnit.value = unit || 'in';
      }
      depthInput.classList.add('has-depth');
    } else {
      if (!editingDepth) {
        depthInput.value = '';
      }
      depthInput.classList.remove('has-depth');
    }
  }

  function refreshSelection() {
    cs.evalScript('getSelectionInfo()', function (res) {
      if (!res || res === 'EvalScript error.') return;
      var parts = res.split('|');              // [cutType, depthVal, depthUnit]
      var type  = parts[0] !== 'none' ? parts[0] : null;
      var dVal  = parts[1];
      var dUnit = parts[2];
      var selectionKey = parts[3] || '';

      if (selectionKey !== _selectionKey) {
        _selectionKey = selectionKey;
        editingDepth = false;
      }

      // Highlight matching cut-type button
      if (type !== _activeCut) {
        _activeCut = type;
        var btns = document.querySelectorAll('.cut');
        for (var i = 0; i < btns.length; i++) {
          btns[i].classList.toggle('active', btns[i].getAttribute('data-cut') === type);
        }
      }

      // Reflect the selected path's stored depth. Untagged paths show a blank field.
      setDepthField(dVal, dUnit);
    });
  }
  if (inCEP) setInterval(refreshSelection, 500);

  // ── Cut-type buttons ──
  var CUT_LABEL = {
    interior: 'Interior', exterior: 'Exterior',
    online: 'On-line', pocket: 'Pocket', guide: 'Guide'
  };
  var cutBtns = document.querySelectorAll('.cut');
  for (var i = 0; i < cutBtns.length; i++) {
    (function (btn) {
      var type = btn.getAttribute('data-cut');
      btn.addEventListener('click', function () {
        host('applyCut("' + type + '")', function (res) {
          if (res.indexOf('OK:') === 0) {
            setStatus(CUT_LABEL[type] + ' applied to ' + res.slice(3) + ' path(s).', 'ok');
          } else {
            setStatus(res, 'err');
          }
        });
      });
    })(cutBtns[i]);
  }

  // ── Depth ──
  function depthArgs() {
    var v = document.getElementById('depthVal').value;
    var u = document.getElementById('depthUnit').value;
    return JSON.stringify(v) + ',' + JSON.stringify(u);
  }

  function cleanPositiveDecimal(v) {
    v = String(v).replace(/^\s+|\s+$/g, '');
    if (!/^\d*\.?\d+$/.test(v)) return null;
    return Number(v) > 0 ? v : null;
  }

  document.getElementById('applyDepth').addEventListener('click', function () {
    var v = document.getElementById('depthVal').value;
    var depth = cleanPositiveDecimal(v);
    if (!depth) { setStatus('Enter a positive decimal depth.', 'err'); return; }
    host('tagDepth(' + depthArgs() + ')', function (res) {
      reportCount(res, 'Depth set on', 'path(s)');
      if (res.indexOf('OK:') === 0) {
        editingDepth = false;
        depthInput.classList.add('has-depth');
      }
    });
  });

  document.getElementById('clearDepth').addEventListener('click', function () {
    var u = document.getElementById('depthUnit').value;
    host('tagDepth("",' + JSON.stringify(u) + ')', function (res) {
      reportCount(res, 'Cleared', 'path(s)');
      if (res.indexOf('CLEARED:') === 0) {
        editingDepth = false;
        setDepthField('', u);
      }
    });
  });

  // ── Export SVG ──
  document.getElementById('exportBtn').addEventListener('click', function () {
    var u = document.getElementById('depthUnit').value;
    setStatus('Exporting…', null);
    host('exportShaperOutput(' + JSON.stringify(u) + ')', function (res) {
      if (res.indexOf('OK:') === 0) {
        var path = res.slice(3);
        setStatus('Exported → ' + path.replace(/^.*[\/\\]/, ''), 'ok');
      } else if (res === 'Cancelled.') {
        setStatus('Export cancelled.', null);
      } else {
        setStatus(res, 'err');
      }
    });
  });
})();

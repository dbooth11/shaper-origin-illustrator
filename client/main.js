/*
 * main.js — Shaper Origin panel UI logic.
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

  document.getElementById('applyDepth').addEventListener('click', function () {
    var v = document.getElementById('depthVal').value;
    if (v === '' || Number(v) <= 0) { setStatus('Enter a depth greater than 0.', 'err'); return; }
    host('tagDepth(' + depthArgs() + ')', function (res) { reportCount(res, 'Depth set on', 'path(s)'); });
  });

  document.getElementById('clearDepth').addEventListener('click', function () {
    var u = document.getElementById('depthUnit').value;
    host('tagDepth("",' + JSON.stringify(u) + ')', function (res) { reportCount(res, 'Cleared', 'path(s)'); });
  });

  // ── Export for Origin ──
  document.getElementById('exportBtn').addEventListener('click', function () {
    var u = document.getElementById('depthUnit').value;
    setStatus('Exporting…', null);
    host('exportForOrigin(' + JSON.stringify(u) + ')', function (res) {
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

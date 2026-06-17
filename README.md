# Shaper Origin for Illustrator

A small Adobe Illustrator panel that applies [Shaper Origin](https://www.shapertools.com/) cut-type encodings to selected paths and exports a Shaper-ready SVG — correctly sized, with cut types and cut depths encoded.

Select path(s) → click a cut type → **Export for Origin**.

## Why

Two things make hand-exporting for Shaper error-prone:

1. **Cut types are colors.** Origin reads the fill/stroke of each shape to decide how to cut it — and the mapping is easy to get backwards (interior is the *white*-filled one, exterior is *black*-filled).
2. **Illustrator exports at 72 dpi; Shaper reads 96.** A 4″ part imports at 3″ (75%) unless the SVG carries explicit real-world units. Illustrator's native SVG export won't write them, and it won't write Shaper's depth attributes at all.

This panel handles both.

## Cut-type encoding

Verified against the Shaper Origin product manual (cut-type encoding) and Shaper Hub's own SVG output.

| Cut type | Stroke | Fill | `shaper:cutType` | Path must be |
|---|---|---|---|---|
| Interior (inside) | black `#000000` | white `#FFFFFF` | `inside` | closed |
| Exterior (outside) | black `#000000` | black `#000000` | `outside` | closed |
| On-line | gray `#7F7F7F` | none | `online` | open or closed |
| Pocket | none | gray `#7F7F7F` | `pocket` | closed |
| Guide | blue `#0068FF` | none | `guide` | open or closed |

Stroke width does not affect cut width. Gray just needs `R=G=B`; guide just needs to read as blue (`#0068FF` is Shaper's template blue).

## Export for Origin

The export does three things in one pass:

1. **Exports with Shaper-correct settings** — presentation attributes (so fill/stroke land as real attributes), text outlined, high coordinate precision, raster off.
2. **Fixes the 72→96 sizing bug** — rewrites the SVG root to explicit physical `width`/`height` (in or mm) against the existing `viewBox`, so the part imports at true size.
3. **Encodes Shaper attributes** — adds `xmlns:shaper`, `shaper:cutType` (from each shape's colors), and `shaper:cutDepth="<n> <unit>"` for depth-tagged shapes.

Example output:

```xml
<svg width="4in" height="4in" viewBox="0 0 288 288"
     xmlns:shaper="http://www.shapertools.com/namespaces/shaper">
  <rect shaper:cutType="inside" shaper:cutDepth="0.2 in"
        fill="#FFFFFF" stroke="#000000" .../>
```

## Cut depth

Type a depth and click **Set Depth** to tag the selected paths (stored in the object name, e.g. `ShaperDepth_0p2_in`, which Illustrator exports as the element id and the exporter converts to `shaper:cutDepth`). The **in/mm** toggle also sets the units written on the SVG root.

## Install (macOS)

```bash
bash install.sh
```

This enables CEP debug mode (so the unsigned panel loads), symlinks the extension into Illustrator's CEP extensions folder, and installs the cut-type scripts under **File ▸ Scripts**. Then fully quit and relaunch Illustrator:

- Panel: **Window ▸ Extensions ▸ Shaper Origin**
- Scripts: **File ▸ Scripts ▸ Shaper – …**

Tested with Illustrator 2025/2026. Work in an **RGB** document in real-world units (in/mm).

## How it's built

- `client/` — CEP panel (HTML/CSS/JS) + Adobe's `CSInterface.js`
- `host/shaper-core.jsxinc` — the engine (`applyCut`, `tagDepth`, `exportForOrigin`)
- `host/shaper.jsx` — CEP host entry point
- `CSXS/manifest.xml` — extension manifest
- `install.sh` — installer

The panel is only chrome; all work runs in the ExtendScript host via `CSInterface.evalScript`.

## Links

- Shaper cut-type encoding: https://support.shapertools.com/hc/en-us/articles/115002721473
- Manual SVG cut-depth encoding: https://support.shapertools.com/hc/en-us/articles/12946815194011
- Adobe CEP resources: https://github.com/Adobe-CEP/CEP-Resources

## License

MIT — see [LICENSE](LICENSE). Bundles Adobe's `CSInterface.js` (BSD-licensed), unmodified.

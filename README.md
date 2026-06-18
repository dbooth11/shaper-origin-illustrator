# Shaper Output for Illustrator

A small Adobe Illustrator panel that applies Shaper Origin-compatible `cut-type` encodings to selected paths and exports an Origin-compliant SVG, correctly sized, with cut types and cut depths encoded.

The panel applies defined Fill and Stroke values for selected type of cut.
The panel allows a cut depth to be set for cut types. Illustrator has no clean way to set custom parameters for SVGs.

## Cut-type encoding

| Cut type | Stroke | Fill | `shaper:cutType` | Encoded depth | Path must be |
|---|---|---|---|---|---|
| Interior (inside) | black `#000000` | white `#FFFFFF` | `inside` | yes | closed |
| Exterior (outside) | black `#000000` | black `#000000` | `outside` | yes | closed |
| On-line | gray `#7F7F7F` | none | `online` | yes | open or closed |
| Pocket | none | gray `#7F7F7F` | `pocket` | yes | closed |
| Guide | blue `#0068FF` | none | `guide` | preserve existing | open or closed |

This exports SVGs that match the output format from Shaper Studio.

## Using

The panel is available at Window > Extensions > Shaper Output

For `.ai` documents, **Export SVG** outputs a Shaper-ready SVG copy of the file. For `.svg` documents opened directly in Illustrator, it opens a Save As.. dialog.

For exported copies, the export does three things in one pass:

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

Select a path(s) and enter a depth/unit.
Click **Set Depth** to apply the value to the selected  paths. Guides do not take depth values.

Cut types are determined by the standard Fill and Stoke values and can just as easily be set in the Properties panel.
Illustrator's normal Save/Export can preserve the visible cut-type colors, but it cannot write custom properties like `shaper:cutDepth`.
**Any path with depth must use the `Export SVG` option.**

If an imported SVG already has a `shaper:cutDepth` tag, we assume it is from Shaper Studio and preserve that value.

## Install

**macOS only.** Requires Illustrator 2020+ (`ILST` 24.0+).

```bash
git clone https://github.com/DBooth/shaper-origin-illustrator.git
cd shaper-origin-illustrator
./install.sh
```

Then fully quit and relaunch Illustrator.

- Panel: **Window ▸ Extensions ▸ Shaper Output**
- Scripts: **File ▸ Scripts ▸ Shaper Output – …**

Re-run `install.sh` after any update to pick up changes (no relaunch needed if the panel is already open — just close and reopen it from Window ▸ Extensions).

## How it's built

- `client/` — CEP panel (HTML/CSS/JS) + Adobe's CEP 9 `CSInterface.js` for Illustrator 2020+ compatibility
- `host/shaper-core.jsxinc` — the engine (`applyCut`, `tagDepth`, `exportShaperOutput`)
- `host/shaper.jsx` — CEP host entry point
- `CSXS/manifest.xml` — extension manifest
- `install.sh` — installer
- `package-zxp.sh` — signed ZXP release packager using Adobe `ZXPSignCmd`

The panel is only chrome; all work runs in the ExtendScript host via `CSInterface.evalScript`.

## Links

- Shaper cut-type encoding: https://support.shapertools.com/hc/en-us/articles/115002721473
- Manual SVG cut-depth encoding: https://support.shapertools.com/hc/en-us/articles/12946815194011

## License

MIT — see [LICENSE](LICENSE). Bundles Adobe's `CSInterface.js` (BSD-licensed), unmodified.

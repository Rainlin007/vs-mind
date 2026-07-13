# Line Shapes Design

## Goal

Provide five visually distinct, deterministic branch shapes without duplicating underline variants: Curve, Straight, Rounded Elbow, Step, and Classic Underline.

## Shapes

### Curve (`curve`)

- Connect topic edge centers with smooth S-shaped curves.
- Remain the default for general-purpose mind maps.

### Rounded Elbow (`elbow`)

- Connect topic edge centers with horizontal and vertical segments.
- Route through the horizontal midpoint between parent and child.
- Round both turns with SVG quadratic curves and a radius capped at 12 px.
- Collapse to a horizontal line when both topic centers share a Y coordinate.

### Straight (`straight`)

- Draw the shortest direct line between topic edge centers.
- Use no intermediate control points or bends.

### Classic Underline (`branch`)

- Curve from the parent toward the bottom edge of the child topic.
- Extend beneath the child topic as an underline.
- Use the parent center for main branches and the parent bottom edge for nested branches.
- Remain the only shape that underlines topics.

### Step (`step`)

- Connect topic edge centers with a horizontal, vertical, horizontal path.
- Keep the turns geometrically square to remain distinct from Rounded Elbow.
- Use round stroke caps and joins for a polished rendering without changing the path geometry.

## Data and UI

- `lineStyle` accepts `curve`, `straight`, `elbow`, `step`, or `branch`.
- Labels are `流畅曲线`, `简洁直线`, `圆角折线`, `阶梯折线`, and `经典下划线`.
- `curve` remains the default and fallback for unknown values.
- Do not preserve aliases for removed line-style values.
- All custom paths are deterministic and mirror correctly for left/right and upward/downward branches.
- Update MMF reference documentation and browser fixtures to use the five values.

## Switching

- Selecting any shape installs both main-branch and sub-branch generators, then redraws links.
- Switching between any two shapes redraws immediately without retaining the previous generator.

## Verification

- Unit tests cover all option labels, normalization, exact geometry, left/right mirroring, upward/downward routes, the single underline shape, and restoration of Curve.
- Browser verification checks that the selector contains exactly the five approved labels and can switch through all five without page errors.

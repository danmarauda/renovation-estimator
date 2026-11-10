# Art direction: Incredible Kitchens 3D studio

This is the client brand, not the ALIAS identity. Everything here serves one rule: the kitchen is the hero and the interface stays quiet.

## Mood

A joiner's scale model on a studio table: honest materials, soft daylight, nothing glossy for its own sake. In the evening the same model is lit from inside, the way a kitchen looks from the garden at dusk.

## Palette (five tokens)

| Token | Value | Use |
|-|-|-|
| Eucalypt (`--brand`) | `#2F5E4E` | The one brand colour: logo, live dot, call-to-action dot. Never a large fill. |
| Ink (`--ink`) | `#2B2B2B` light, `#F1F1F1` dark | Text and the selected state of a control. |
| Stone (`--st-0` to `--st-5`) | neutral surface ramp from the kit | Every panel, dock and card. One ramp, no second grey. |
| Brass (`--brass`) | `#D9A441` | The 3D hover and selection edge, taken from the hardware in the model. It reads on painted, stone, timber and steel surfaces where the brand green would disappear on green cabinets. |
| Dusk (`--dusk`) | `#141519` | The stage backdrop in the Evening mood. |

Finish colours inside the 3D scene come from `business.config.js` and are content, not interface colour.

## Type (two families)

- Cormorant, 500 and 500 italic: the page title only.
- Inter Tight, 400, 500, 600: everything else.
- Prices use tabular numerals and a fixed line box, so a changing total never moves its neighbours.
- Sizes in the panel: 12 (caption), 13, 14 (body), 16, 20, 24 (step heading), 26 to 34 (estimate). Nothing below 12 px.

## Light

One image-based light per mood, drawn in code to match this room (no HDR download), plus one key light.

| | Day | Evening |
|-|-|-|
| Image-based light | Large cool window on the back wall, warm ceiling bounce, soft fill from the open side | Near-black room, three warm pendant sources, a thin warm strip at under-cabinet height, dusk-blue window |
| Key light | Warm white sun from front right, about 36 degrees above the horizon so it reaches the splashback, soft shadow | Same direction, dusk blue, about a quarter of the strength, so shadows stay grounded and paint keeps its colour |
| Practical lights | Off | Pendants pool warm light on the island; under-cabinet strips wash the splashback |
| Backdrop | Light stone | Dusk |

- Tone mapping: Khronos PBR Neutral, on purpose. It keeps a chosen paint or stone colour close to its swatch, which a filmic curve would shift. Exposure is set per mood.
- Shadows touch the floor: one soft shadow map, a ground catcher under the model, and ambient occlusion in corners, under overhangs and behind the kickboards.
- Day to Evening is a mood change, not a dimmer: colour temperature, direction of light and where the eye goes all change.

## Materials

Physically based, with texture scale in metres: 150 x 75 mm subway tile, 190 mm floor boards, 2 mm reveals between fronts. Painted fronts are satin, stone is polished or honed according to its option, steel is brushed, glass is clear with a reflection, never a flat blue.

## Motion

| Thing | Duration | Easing |
|-|-|-|
| Press feedback | 100 ms | kit ease |
| Hover and selection edge in 3D | 220 ms in, 200 ms out | ease out |
| Finish change (cross-fade) | 320 ms | ease in-out |
| Price count | 650 ms | ease out cubic |
| Camera move between shots | 700 to 1500 ms by distance | critically damped settle, no bounce |
| Day to Evening | 1100 ms | ease in-out |
| Arrival reveal | 2200 ms, once | critically damped settle |

Every camera move can be interrupted by the user's own drag, wheel or keys. With `prefers-reduced-motion`, camera moves and lighting changes are cuts, there is no arrival reveal, no auto-rotate on load and prices change at once.

## Interface

- The step dock, the single inspector and the pinned estimate stay. They share one surface ramp and one radius family.
- Selected states use a raised surface and ink, not a second accent.
- Focus rings are 2.5 px in the focus token with an offset, on every control and on the canvas.
- Touch targets are at least 44 px.

## Voice

Australian English, mm and m², AUD. Plain and specific. Prices are planning allowances and the "not a quote" line stays beside every total. No claims, awards, lead times or testimonials that the business has not supplied.

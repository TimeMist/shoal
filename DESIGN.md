---
name: Shoal
description: Buy like a chain. Stay independent. Independent shops buy together in buying rounds, settled with PayPal.
colors:
  blush: "#FFF7F6"
  white: "#FFFFFF"
  blackberry-ink: "#1F0A24"
  muted-plum: "#6E5670"
  rule: "#F1DFE3"
  tint: "#F9E6EC"
  pool-well: "#FFF1F4"
  slot: "#E8C3CE"
  field-stroke: "#E3C9D1"
  disabled-fill: "#EEDDE2"
  jam: "#7A0E3A"
  jam-deep: "#5E0A2C"
  on-jam-text: "#F6D9E3"
  berry: "#E0146F"
  berry-deep: "#C2105F"
  coral: "#F45D4F"
  shop-tint: "#FFE7E3"
  plum: "#5A1E8C"
  supplier-tint: "#EEE6F7"
  leaf: "#7FAE34"
  leaf-light: "#C5E88A"
  leaf-ink: "#4F7A16"
  on-dark-coral: "#FF8A7A"
  on-dark-pink: "#FF6FA8"
  on-dark-lilac: "#C9A0E8"
typography:
  display:
    fontFamily: "Funnel Display, system-ui, sans-serif"
    fontSize: "clamp(44px, 5vw, 80px)"
    fontWeight: 750
    lineHeight: 0.95
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Funnel Display, system-ui, sans-serif"
    fontSize: "clamp(34px, 4vw, 52px)"
    fontWeight: 750
    lineHeight: 1
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Funnel Display, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  price:
    fontFamily: "Funnel Display, system-ui, sans-serif"
    fontSize: "56px"
    fontWeight: 750
    lineHeight: 1
    letterSpacing: "-0.035em"
    fontFeature: "tnum"
  lead:
    fontFamily: "Funnel Sans, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 400
    lineHeight: 1.55
  body:
    fontFamily: "Funnel Sans, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
  ui:
    fontFamily: "Funnel Sans, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Funnel Sans, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    letterSpacing: "0.06em"
  code:
    fontFamily: "ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "0.88em"
    fontWeight: 500
    lineHeight: 1
rounded:
  hairline: "4px"
  xs: "6px"
  bar: "8px"
  sm: "10px"
  field: "12px"
  rung: "14px"
  md: "16px"
  pool: "22px"
  lg: "24px"
  xl: "28px"
  stage: "32px"
  pill: "999px"
spacing:
  2xs: "6px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "56px"
  section: "72px"
components:
  button-primary:
    backgroundColor: "{colors.jam}"
    textColor: "{colors.white}"
    rounded: "{rounded.pill}"
    padding: "12px 20px"
  button-primary-hover:
    backgroundColor: "{colors.jam-deep}"
  button-join:
    backgroundColor: "{colors.berry}"
    textColor: "{colors.white}"
    rounded: "{rounded.pill}"
    padding: "12px 20px"
  button-join-hover:
    backgroundColor: "{colors.berry-deep}"
  button-ghost:
    backgroundColor: "{colors.white}"
    textColor: "{colors.blackberry-ink}"
    rounded: "{rounded.pill}"
    padding: "12px 20px"
  button-disabled:
    backgroundColor: "{colors.disabled-fill}"
    textColor: "{colors.muted-plum}"
    rounded: "{rounded.pill}"
    padding: "12px 20px"
  input-field:
    backgroundColor: "{colors.white}"
    textColor: "{colors.blackberry-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "11px 14px"
  status-reserved:
    backgroundColor: "{colors.supplier-tint}"
    textColor: "{colors.plum}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  status-round-open:
    backgroundColor: "#FCE3EE"
    textColor: "#B0105A"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  status-settled:
    backgroundColor: "#EEF5E2"
    textColor: "{colors.leaf-ink}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  status-released:
    backgroundColor: "#F2EAEE"
    textColor: "{colors.muted-plum}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  status-claim-open:
    backgroundColor: "#FBE1E9"
    textColor: "{colors.jam}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  panel:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.lg}"
    padding: "24px"
  round-card:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.stage}"
    padding: "24px"
  round-pool:
    backgroundColor: "{colors.pool-well}"
    rounded: "{rounded.pool}"
    height: "230px"
  ladder-rung:
    backgroundColor: "{colors.blush}"
    textColor: "{colors.muted-plum}"
    rounded: "{rounded.rung}"
    padding: "10px 12px"
  ladder-rung-active:
    backgroundColor: "{colors.jam}"
    textColor: "{colors.white}"
  ladder-rung-agreed:
    backgroundColor: "{colors.berry}"
    textColor: "{colors.white}"
  feed-chip-shop:
    backgroundColor: "{colors.shop-tint}"
    textColor: "{colors.blackberry-ink}"
    rounded: "{rounded.pill}"
    padding: "5px 10px"
  feed-chip-supplier:
    backgroundColor: "{colors.supplier-tint}"
    textColor: "{colors.blackberry-ink}"
    rounded: "{rounded.pill}"
    padding: "5px 10px"
  jam-band:
    backgroundColor: "{colors.jam}"
    textColor: "{colors.white}"
    rounded: "{rounded.xl}"
    padding: "32px"
  chip-link:
    backgroundColor: "{colors.white}"
    textColor: "{colors.blackberry-ink}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
---

# Design System: Shoal

<!-- Source of truth: design/brand/index.html (Shoal brand guidelines v2) and design/brand/logo/shoal-*.svg. Supersedes the Sweetspot system (same palette and type; new product, name, mark and signature component). Known gap: the Next.js app in app/ does not use this system yet; app/globals.css still carries create-next-app defaults (Geist, #ffffff / #171717, dark-mode inversion). Those defaults are not part of this system and should be replaced, not extended. -->

## Overview

**Creative North Star: "Small Fish, Moving As One"**

Shoal is where many small orders become one big one. The whole system is built around a single image: dozens of small dots gathering until, together, they form one fish. Each independent shop is a dot; the completed fish is the round. A calm blush ground, Blackberry ink text and deep Jam surfaces stay quiet so that the moment the fish completes, in the one coral to berry to plum ramp, is the most colourful thing on any screen. The brand is collective, straight and quietly clever: the friendliest person at the local business association, not a trading terminal and not a pink-violet AI startup.

Surfaces are soft without being sticky. Panels are white on blush with generous rounding (16 to 32px) and a single soft neutral shadow. The mark's dots are flat colour; only the three role swatches carry a soft glaze; nothing glows. Funnel Display at heavy weights carries headlines and prices, Funnel Sans carries everything else, and every changing figure uses tabular figures. The Swimmy's eye is the agent: it blinks, glances at each shop that joins, tilts while negotiating with the supplier, and closes into a smile when a round closes.

Colour roles are fixed: coral is a shop, plum is the supplier, berry is the closed round (and the join and approve actions), leaf is money saved or settled. Money language is always explicit about whether funds are reserved, captured or released, and the visual system mirrors that through dedicated status chips.

**Key Characteristics:**
- Blush ground, white panels, Jam as the deep surface; never black or navy.
- One gradient (coral to berry to plum), used only across the logo's dots and the completed fish.
- Fixed role colours: coral a shop, plum the supplier, berry the closed round and join/approve, leaf savings.
- Heavy Funnel Display for headlines and prices; tabular figures everywhere a number can change.
- The round pool: the Swimmy assembles dot by dot as shops join, then pulses once, ripples once and goes still.
- Flat dots and soft, springy, purposeful motion; the eye is the agent's state indicator.

## Colors

A berry palette held almost entirely in calm neutrals, so its saturated role colours land with full force when they appear.

### Primary
- **Jam** (#7A0E3A): Deep surfaces (Jam bands, logo tiles, the app icon ground), headline numbers, primary buttons and the active ladder rung. White, On-Jam Text (#F6D9E3) and Leaf Light sit on it. Hover deepens to **Jam Deep** (#5E0A2C).
- **Berry** (#E0146F): The closed round. The "Agreed" rung, the close ripple, the join and approve buttons ("Join round", "Approve $22.20 refund"), focus rings, text selection, choreography timestamps and the emphasised words of a hero headline. Carries white text. Hover deepens to **Berry Deep** (#C2105F).

### Secondary
- **Coral** (#F45D4F): A shop. Shop dots in the allocation grid, the shop end of the ramp, the shop role swatch. Shapes only; coral never carries white text. Its quiet partner **Shop Tint** (#FFE7E3) fills shop chips in the round feed.
- **Plum** (#5A1E8C): The supplier. A red-leaning, fruit-like purple: the supplier's one-colour Swimmy, supplier timeline bars, Reserved status text and the plum end of the ramp. **Supplier Tint** (#EEE6F7) fills supplier feed chips and the Reserved chip.

### Tertiary
- **Leaf** (#7FAE34): Savings shapes and large figures on Jam.
- **Leaf Light** (#C5E88A): Savings text on Jam ("$66.00 saved").
- **Leaf Ink** (#4F7A16): Savings on light surfaces (the Saved column, "You saved"), Captured, Delivered and Resolved status, the guardrail pill and the "Do" marker.

### The Swimmy ramps
- **Light ramp:** Coral (#F45D4F) to Berry (#E0146F) to Plum (#5A1E8C), sampled by each dot's x position. Lowest dot contrast is 3.18:1 on Blush and 3.35:1 on white.
- **On-dark ramp:** **On-Dark Coral** (#FF8A7A) to **On-Dark Pink** (#FF6FA8) to **On-Dark Lilac** (#C9A0E8), also sampled by x, for the mark on Jam and on Blackberry Ink. Lowest dot contrast is 4.15:1 on Jam and 7.19:1 on ink.

### Neutral
- **Blush** (#FFF7F6): The page ground everywhere Shoal speaks as itself; also the resting ladder rung.
- **White** (#FFFFFF): Panels, cards, fields, ghost buttons, the round card.
- **Blackberry Ink** (#1F0A24): All primary text and icons; the eye's outline and pupil; prices.
- **Muted Plum** (#6E5670): Secondary text, captions, struck-through solo prices, table headers, resting rungs, Released status.
- **Rule** (#F1DFE3): Hairline dividers, section borders, the 1px base line under panels, ghost-button and stepper strokes, timeline gridlines.
- **Tint** (#F9E6EC): Navigation hover and current item, inline code, stepper hover, motion lanes, placeholder wells.
- **Pool Well** (#FFF1F4): The ground of the round pool; also table row hover.
- **Slot** (#E8C3CE): The faint empty dots of an unfilled Swimmy. Deliberately low contrast (decorative state); the committed-units count beside it carries the information in text.
- **Field Stroke** (#E3C9D1) and **Disabled Fill** (#EEDDE2): input borders and disabled buttons.

### Named Rules
**The One Gradient, One Moment Rule.** Coral to berry to plum appears only across the logo's dots and the completed fish (and the small-mark favicon, which is the same mark at small sizes). Never on backgrounds, buttons, cards or text. The same-hue shading inside the coral and plum role swatches (#FF8476 to #F45D4F, #7A35B5 to #5A1E8C) is swatch material, not a second gradient.

**The Jam, Not Black Rule.** Deep surfaces, headline numbers and primary buttons use Jam, never near-black or navy. Blackberry Ink is for text, and appears as a surface only as the second on-dark logo ground.

**The Plum, Not Electric Violet Rule.** The supplier is a red-leaning purple that reads as fruit. Generic AI violets and blue-violets are off the table.

**The Leaf For Savings Rule.** Leaf marks money saved and settled payments: Leaf for shapes and large figures on Jam, Leaf Light for text on Jam, Leaf Ink on light surfaces. Never decoration, never a generic success colour for unrelated UI.

**The Rarity Rule.** On a Shoal screen, roughly Blush 58%, White 16%, Ink 12%, Jam 8%; coral, berry and plum together stay under about 6%.

**The PayPal Stays PayPal Rule.** PayPal's button is gold with navy text and handles every reservation and payment, so Shoal never uses gold, yellow or PayPal blue in its own UI and always renders PayPal's own buttons through the PayPal SDK, never restyled. The gold block on the guidelines board is a placement stand-in, not a Shoal colour.

## Typography

**Display Font:** Funnel Display (with system-ui, sans-serif)
**Body Font:** Funnel Sans (with system-ui, sans-serif)
**Label/Mono Font:** ui-monospace, "SF Mono", Menlo, monospace, for code tokens only

**Character:** One family in two cuts, so the voice stays consistent from a giant price to a tiny label. Funnel Display at 700 to 750 with tight negative tracking feels chunky and confident; Funnel Sans is plain and readable. Both are free Google Fonts (SIL OFL), loaded as variable weights (Display 400 to 800, Sans 400 to 700).

### Hierarchy
- **Display** (750, clamp 44 to 80px, 0.95, -0.04em): The one hero headline per page, balanced wrapping. Emphasised words may take Berry.
- **Headline** (750, clamp 34 to 52px, 1.0, -0.03em): Section heads. Jam-band and big definition titles run 26 to 40px at 750.
- **Title** (700, 22px, 1.2, -0.02em): Sub-section heads. Card, product and definition titles run 15 to 18px Display 700; the round card's product title is 17px.
- **Price** (750, 56px, tabular): Agreed prices. Other money figures step down by context: 44px in the negotiation middle, 40px on a closed-round card, 34px for the live price when joining, 28px for the pool's unit count, 20px in ladder rungs. A solo price beside a group price sits at Display 500, 24px, Muted Plum, struck through at 2px.
- **Lead** (400, 19px, 1.55, Muted Plum): One-paragraph intros under a section head, max 62ch. The hero's idea line is 20px, max 44ch.
- **Body** (400, 16px, 1.55): Running text, max 70ch.
- **UI text** (Funnel Sans 400 to 600, 11 to 17px): The secondary sizes the components use: 11px uppercase grid and timeline headers, 12px captions and tags, 13px notes, rungs, chips and status, 14px navigation, fields and table cells, 15px buttons and list text, 17px the stepper value (Display 700).
- **Label** (600, 12px, 0.04 to 0.06em, uppercase): Table and timeline column headers (11px), Do/Don't tags and backlog timing tags. Not used as a kicker above headlines.
- **Code** (monospace 500, 0.88em, on Tint, 6px radius): Inline code tokens only; never for figures or UI labels.

### Named Rules
**The Tabular Price Rule.** Every price, count and changing figure uses tabular figures so it never jumps as it changes.

**The Ink Price Rule.** The group price is Blackberry Ink (or white on Jam), never red; the saving is shown by a struck-through solo price in Muted Plum and a Leaf figure.

## Layout

Content sits in a centred container up to 1320px wide with 32px side padding (16px below 900px), split into a 200px sticky index and the main column with a 56px gap. Text measures are capped (lead 62ch, body 70ch). Sections are separated by a 1px Rule hairline with 72px top padding (48px on small screens). Grids are simple equal-column grids (2, 3, 4 or 5 columns) with 12 to 20px gaps; at 1100px the five-rule band drops to two columns and the negotiation view stacks; at 900px everything stacks to one column (palettes, logo variants, misuse examples and four-up definitions keep two) and the ladder becomes a wrapping row beside the pool. Typographic definition rows (a 2px Ink top rule, a Display title, a muted description) are preferred over card grids for lists of principles. Data views (allocation grid, timeline) scroll sideways inside their own container rather than squeezing. Spacing steps observed: 6, 8, 12, 16, 24, 32, 56, 72px.

## Elevation & Depth

A hybrid of tonal layering and one soft shadow. The default depth is white on blush. Raised panels (the round card, primary panels) carry a single ambient shadow made of a 1px Rule base line plus a long, very soft Blackberry-tinted falloff; most smaller cards use only the 1px base line. Jam surfaces carry no shadow; their depth is colour. Ghost elements use a 1px inset stroke rather than a border. Nothing uses glass, backdrop blur or coloured halos.

### Shadow Vocabulary
- **Soft lift** (`box-shadow: 0 1px 0 #F1DFE3, 0 24px 60px -36px rgba(31,10,36,.32)`): The round card and main panels.
- **Base line** (`box-shadow: 0 1px 0 #F1DFE3`): Flat panels, swatches, tiles, data views, party cards.
- **Inset stroke** (`box-shadow: inset 0 0 0 1px #F1DFE3`): Ghost buttons, chip links and the stepper; hover swaps the stroke to Ink or Berry.
- **Field focus** (`box-shadow: 0 0 0 3px rgba(224,20,111,.18)` with a Berry border): Text inputs only.
- **Claim marker** (`box-shadow: inset 0 0 0 1.5px #7A0E3A`): The claim bar on a delivery lane.

### Named Rules
**The Flat, Never Glowing Rule.** The Swimmy's dots are flat colour; the three role swatches get a soft white glaze (60% to 0% radial highlight, upper left) at most. No neon halos, glassmorphism, drop-shadow glows or colour blurs, on the mark or anywhere else.

## Shapes

Rounded and calm. Radii step 10px (navigation items), 12px (fields, negotiation lines), 14px (ladder rungs, demo wells), 16px (cards, swatches, photo wells), 22px (the pool), 24px (panels, tiles, data views), 28px (Jam bands), 32px (the round card), and full pills for buttons, chips, status and lanes. Small marks use 4 to 8px: 6px on inline code and focus rings, 8px on timeline bars, 4px on tiny demo glyph bars. Borders are rare: hairline Rule dividers, 1px field strokes and the 2px Ink top rule on definition rows.

The Swimmy is the brand's silhouette. On a 64-unit grid: 61 flat dots of radius 1.75 on a hex lattice (4.4 across, 3.8 down, odd rows offset 2.2) inside a fish outline with a forked tail to the right. The eye sits at the head (left): radius 3.6, white sclera with a 1.1 Blackberry Ink outline and an ink pupil of radius 1.9, so it reads on white. Clear space is one eye diameter. Below 48px the 61-dot mark is replaced by the small mark: the same fish built from 30 dots of radius 2.45 on a coarser hex lattice (6 across, 5.2 down, odd rows offset 3) in the same ramp, with a larger eye (radius 4.6, 1.3 outline, pupil 2.4), so it still reads as many becoming one at 16px. Logo files: full colour, on-dark (ink and Jam), one-colour Ink / Jam / white (the eye becomes an outline ring in the mono colour), lockups with the lowercase "shoal" wordmark in ink and white, the small-mark favicon, and an app icon of on-dark dots on a Jam rounded square (112 / 512 corner).

## Components

Soft, pill-shaped and calm at rest; one confident colour per action.

### Buttons
- **Shape:** Full pill (999px), 12px 20px padding, Funnel Sans 600 15px, optional 8px icon gap.
- **Primary:** Jam with white text for ordinary primary actions ("Start a round"). Hover deepens to Jam Deep.
- **Join / approve:** Berry with white text, reserved for joining a round and approving money moves ("Join round · reserve $259.20", "Approve $22.20 refund"). Hover deepens to Berry Deep.
- **Ghost:** White with a 1px Rule inset stroke and Ink text; hover darkens the stroke to Ink. Used for secondary actions, downloads and replay.
- **Pressed / loading / disabled:** Press scales to 0.97 (120ms ease-out). Loading shows a 14px white spinner beside a present-tense label ("Closing round") with `aria-busy`. Disabled is Disabled Fill with Muted Plum text and no shadow.
- **Focus:** 2px Berry outline, 3px offset, across all interactive elements.

### Chips (status)
- **Style:** Pill, 13px 600, 4px 10px, a 7px dot in the current colour, always paired with a word.
- **States:** Reserved (Plum on #EEE6F7), Round open (#B0105A on #FCE3EE), Captured / Delivered / Resolved (Leaf Ink on #EEF5E2), Released (Muted Plum on #F2EAEE; the shop-facing word for a voided authorization), Claim open (Jam on #FBE1E9).

### Cards / Containers
- **Corner Style:** 16px small cards, 24px panels, 28px Jam bands, 32px the round card.
- **Background:** White on Blush; Jam for banded rule sections (white headings, On-Jam Text body, Leaf Light for savings).
- **Shadow Strategy:** Soft lift for primary panels, base line for the rest (see Elevation & Depth).
- **Internal Padding:** 16 to 18px small cards, 24px panels, 32px Jam bands (24px 20px on small screens).

### Inputs / Fields
- **Style:** White, 1px Field Stroke, 12px radius, 11px 14px padding, Funnel Sans 500 16px; label above at 14px.
- **Focus:** Berry border plus a 3px translucent Berry ring.
- **Error:** Jam border and a Jam 13px message in plain language that says what happened and how to fix it ("That's below your floor of $1.80. Raise the price, or lower the floor in your settings.").
- **Quantity stepper:** A pill with a Rule inset stroke, 42px square buttons on white (Tint on hover) and a 17px Display 700 tabular value announced in a polite live region; the reservation sentence beneath updates with it.

### Navigation
- **Style:** A quiet text index in Muted Plum 14px, 6px 10px padding, 10px radius; hover and current item take Ink text on Tint. The small dot mark and the "shoal" wordmark in Funnel Display 700 sit above it. Below 900px it becomes a sticky horizontal strip on Blush with a Rule bottom border; the wordmark hides and the mark stays.

### Round Pool (signature)
The defining component. A white round card (32px radius, soft lift) holds a header with the product and supplier, the pool and the tier ladder side by side, a feed of arrival chips and a caption. The pool is a Pool Well (22px radius, 230px minimum height) showing the Swimmy at about 3.6x scale as faint Slot dots (radius 1.05). Each shop that joins fills `round(totalUnits / roundUnits × 61)` dots: each dot flies in from the right, grows to radius 1.75 and takes its ramp colour (ease-spring 900ms, 25ms stagger). The committed-units count (Display 750 28px, tabular) sits outside the fish in the pool's top-left, so text never overlaps the dots. The ladder lists each tier (Blush rungs, 14px radius, Display 750 20px prices); the current tier is Jam with white text, scaled 1.02, and passed tiers are struck through. The eye glances at every arrival; feed chips are Shop Tint for shops and Supplier Tint for the supplier. At close the fish completes, pulses once (scale 1.06), one 2.5px Berry ripple spreads, the eye closes into a smile, the tier rungs release and a Berry "Agreed" rung appears with the achieved price. Then everything is still. The card is a polite live region.

### Swimmy (living logo)
The eye is the agent's state: idle blinks every 4 to 6s (scaleY 0.08, 140ms); on the round page it may swim gently in place; it glances toward each new shop (pupil shift, 450ms ease-out); it tilts gently while negotiating with the supplier; on a closed round it hops or pulses once and the eye closes into a smile (ease-pop). It also serves as the loading state. In the negotiation view the Shoal agent is the full-colour Swimmy and the supplier is a one-colour Plum Swimmy, mirrored to face it, with #FCE3EE message lines for the Shoal agent and #EFE7F8 for the supplier.

### Data views (placement mock-ups)
The allocation grid (AG Grid in the app) uses 11px uppercase Muted Plum headers on #FFFBFB, Rule row lines, Pool Well row hover, right-aligned tabular numbers, a coral dot beside each shop name, Leaf Ink savings and status chips for delivery. The round timeline (Bryntum in the app) puts the round on a Jam bar, the supplier on a Plum bar, shipping on #F7B3AC with ink text, delivered on #DCEBC6 with Leaf Ink, and a claim on its own lane only (Claim marker). The board's previews are styled mock-ups of the Shoal theme on those libraries, not the libraries' own styling.

### Motion
Motion tells the story of the round: shops arrive, the price steps down, the group gathers and becomes one order. One authored moment per screen. Easing: ease-out `cubic-bezier(.16,1,.3,1)` for entrances, feed chips and panels (240 to 450ms); ease-spring `cubic-bezier(.34,1.4,.64,1)` for dots flying into place (900ms); ease-pop `cubic-bezier(.34,1.56,.64,1)` for the completion pulse, tier step-down and eye smile (500 to 700ms). The close choreography runs: status chip changes (0ms, ease-out 240ms), last dots fly in and complete the fish (200ms, ease-spring 900ms, 25ms stagger), one pulse and one ripple (900ms, ease-pop 700ms), the eye smiles and the ladder shows the agreed price (1,100ms, ease-pop 600ms), each shop's card flips from Reserved to Captured with its saving and screen readers hear "Round closed at $1.85 a carton. You paid $222.00." (1,300ms). Under reduced motion dots appear in place without flying, the pulse is skipped, the eye stops blinking and swimming, and nothing loops.

## Do's and Don'ts

### Do:
- **Do** put Shoal screens on Blush (#FFF7F6) with white panels and Jam (#7A0E3A) as the only deep surface.
- **Do** use Jam for ordinary primary actions and Berry (#E0146F) only for joining a round, approving money moves and the closed round.
- **Do** keep coral a shop, plum the supplier, berry the closed round and leaf savings, and name each party in words too.
- **Do** set every price and count in tabular figures, with the group price in Ink and the solo price struck through in Muted Plum.
- **Do** say where the money is: Reserved, Captured or Released, always as a word on the chip, never colour alone.
- **Do** use the on-dark ramp (#FF8A7A to #FF6FA8 to #C9A0E8) whenever the dot mark sits on Jam or ink.
- **Do** use the 61-dot mark at 48px and up and the 30-dot small mark below 48px.
- **Do** meet WCAG 2.2 AA: body text at least 4.5:1, dots and UI shapes at least 3:1.
- **Do** render PayPal buttons through PayPal's SDK, after the one-sentence reservation explanation.
- **Do** give every animation a still equivalent under reduced motion.

### Don't:
- **Don't** use the coral to berry to plum gradient anywhere except the logo's dots and the completed fish: not on backgrounds, buttons, cards or text.
- **Don't** use near-black or navy for deep surfaces; use Jam.
- **Don't** use electric or blue-leaning AI violets; Plum (#5A1E8C) is the only purple.
- **Don't** use gold, yellow or PayPal blue in Shoal UI, and never restyle PayPal's buttons.
- **Don't** put white text on Coral.
- **Don't** add neon halos, glassmorphism, backdrop blur or coloured glows; dots are flat.
- **Don't** flip or tilt the Swimmy, recolour it outside the palette, use the small mark at 48px and up, fill the fish as a solid shape, or add glows, shadows or effects to it.
- **Don't** put numbers or text over the fish in the round pool.
- **Don't** use Leaf as decoration or as a generic success colour.
- **Don't** animate for decoration: nothing drifts or loops without meaning, and a closed round gets one final moment, then stillness.

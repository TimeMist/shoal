---
name: Sweetspot
description: Haggling, but make it sweet. Two prices melt into one deal, closed with PayPal.
colors:
  blush: "#FFF7F6"
  white: "#FFFFFF"
  blackberry-ink: "#1F0A24"
  muted-plum: "#6E5670"
  rule: "#F1DFE3"
  tint: "#F9E6EC"
  field-stroke: "#E3C9D1"
  disabled-fill: "#EEDDE2"
  jam: "#7A0E3A"
  jam-deep: "#5E0A2C"
  berry: "#E0146F"
  berry-deep: "#C2105F"
  coral: "#F45D4F"
  plum: "#5A1E8C"
  leaf: "#7FAE34"
  leaf-ink: "#4F7A16"
  leaf-light: "#C5E88A"
typography:
  display:
    fontFamily: "Funnel Display, system-ui, sans-serif"
    fontSize: "clamp(52px, 6.4vw, 96px)"
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
  body:
    fontFamily: "Funnel Sans, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
  lead:
    fontFamily: "Funnel Sans, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Funnel Sans, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    letterSpacing: "0.06em"
rounded:
  sm: "10px"
  field: "12px"
  md: "16px"
  lg: "24px"
  xl: "28px"
  stage: "32px"
  pill: "999px"
spacing:
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
  button-deal:
    backgroundColor: "{colors.berry}"
    textColor: "{colors.white}"
    rounded: "{rounded.pill}"
    padding: "12px 20px"
  button-deal-hover:
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
  status-paid:
    backgroundColor: "#EEF5E2"
    textColor: "{colors.leaf-ink}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  status-live:
    backgroundColor: "#FCE3EE"
    textColor: "#B0105A"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  status-held:
    backgroundColor: "#EEE6F7"
    textColor: "{colors.plum}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  status-none:
    backgroundColor: "#F2EAEE"
    textColor: "{colors.muted-plum}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  panel:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.lg}"
    padding: "24px"
  jam-surface:
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

# Design System: Sweetspot

<!-- Source of truth: design/brand/index.html (brand guidelines v1) and design/brand/logo/. The Next.js app in app/ does not use this system yet: app/globals.css still carries create-next-app defaults (Geist, #ffffff / #171717, dark-mode inversion). Those defaults are not part of this system and should be replaced, not extended. -->

## Overview

**Creative North Star: "Two Prices Melt Into One"**

Sweetspot is where a shopper's price and a shop's price slide together until they become one deal. The whole system is built around that single moment: a calm blush ground, Blackberry ink text and deep Jam surfaces stay quiet so that the meeting of a coral drop (the shopper) and a plum drop (the shop's agent) into one berry drop is the most colourful thing on any screen. The brand is warm, fair and quietly clever: a good shopkeeper, not a trading terminal and not a pink-violet AI startup.

Surfaces are soft and confectionery without being sticky. Panels are white on blush with generous rounding (16 to 32px) and a single soft neutral shadow; drops carry a sugar-glaze highlight; nothing glows. Funnel Display at heavy weights carries headlines and prices, Funnel Sans carries everything else, and every price uses tabular figures. The Agent Tag (a price tag whose hole is the agent's eye) is the brand's living presence: in the product the eye watches offers, blinks, thinks and smiles when a deal lands.

Two audiences see two different expressions. Everything a merchant sees (dashboard, landing, agent-vs-agent view) is pure Sweetspot. The shopper chat is white-labelled: it inherits each shop's fonts and colours, and the only Sweetspot element is a small "Negotiated by Sweetspot" badge.

**Key Characteristics:**
- Blush ground, white panels, Jam as the deep surface; never black or navy.
- One multi-hue gradient (coral to berry to plum), used only at the deal moment and in the logo.
- Party colours with fixed meaning: coral the shopper, plum the shop agent, berry the deal, leaf money won.
- Heavy Funnel Display for headlines and prices; tabular figures everywhere a number can change.
- Soft, springy, purposeful motion: things travel toward agreement, bounce off limits, melt when they meet, then go still.
- The Agent Tag eye as the agent's state indicator (idle, watching, thinking, deal).

## Colors

A berry palette held almost entirely in calm neutrals, so its four saturated party colours land with full force when they appear.

### Primary
- **Jam** (#7A0E3A): Deep surfaces (dashboard headline card, banded sections, logo tiles), headline money figures, and primary buttons. White and Leaf light text sit on it. Hover deepens to **Jam Deep** (#5E0A2C).
- **Berry** (#E0146F): The deal. The accept-deal button, the merged deal drop, the deal ripple, focus rings, text selection and emphasised words in a hero headline. Carries white text. Hover deepens to **Berry Deep** (#C2105F).

### Secondary
- **Coral** (#F45D4F): The shopper. Shopper drops, shopper chips and shopper-side tints. Shapes only; coral never carries white text.
- **Plum** (#5A1E8C): The shop's agent. A red-leaning, fruit-like purple: agent drops, typing dots, "held" status and agent-side labels.

### Tertiary
- **Leaf** (#7FAE34): Money-won shapes and large figures on Jam.
- **Leaf Ink** (#4F7A16): Money won and Paid status on light surfaces; the "Do" marker in guidance.
- **Leaf Light** (#C5E88A): Money-won text on Jam (for example the week-over-week gain under the headline figure).

### Neutral
- **Blush** (#FFF7F6): The page ground everywhere Sweetspot speaks as itself.
- **White** (#FFFFFF): Panels, cards, fields, ghost buttons.
- **Blackberry Ink** (#1F0A24): All primary text and icons; the eye's pupil in the logo; deal prices.
- **Muted Plum** (#6E5670): Secondary text, captions, struck-through list prices, table headers.
- **Rule** (#F1DFE3): Hairline dividers, section borders, the 1px base line under panels, ghost-button stroke.
- **Tint** (#F9E6EC): Hover and current-item fill in navigation, inline code background, quiet demo wells.
- **Field Stroke** (#E3C9D1) and **Disabled Fill** (#EEDDE2): input borders and disabled buttons.

### Named Rules
**The One Gradient, One Moment Rule.** The coral to berry to plum gradient (`#F45D4F` 0%, `#E0146F` 50%, `#5A1E8C` 100%, diagonal) appears only in the deal drop and the logo. Never on backgrounds, buttons, cards or text. Same-hue shading inside a single drop (coral #FF8476 to #F45D4F, plum #7A35B5 to #5A1E8C) and the white glaze highlight are part of the drop material, not a second gradient.

**The Jam, Not Black Rule.** Deep surfaces, headline numbers and primary buttons use Jam, never near-black or navy. Blackberry Ink is for text, not for surfaces.

**The Plum, Not Electric Violet Rule.** The shop agent is a red-leaning purple that reads as fruit. Generic AI violets and blue-violets are off the table.

**The Leaf Means Money Rule.** Leaf marks revenue won back and paid deals. Never decoration, never a generic success colour for unrelated UI.

**The Rarity Rule.** On a Sweetspot-branded screen, roughly Blush 58%, White 16%, Ink 12%, Jam 8%; coral, berry and plum together stay under about 6%.

**The PayPal Stays PayPal Rule.** PayPal's button is gold with navy text and closes every deal, so Sweetspot never uses gold, yellow or PayPal blue in its own UI, and always renders PayPal's own buttons through the PayPal SDK, never restyled.

## Typography

**Display Font:** Funnel Display (with system-ui, sans-serif)
**Body Font:** Funnel Sans (with system-ui, sans-serif)
**Label/Mono Font:** ui-monospace, "SF Mono", Menlo for inline code only

**Character:** One family in two cuts, so the voice stays consistent from a giant price to a tiny label. Funnel Display at 700 to 750 with tight negative tracking feels chunky and edible; Funnel Sans is plain and readable. Both are free Google Fonts (SIL OFL), loaded as variable weights (Display 400 to 800, Sans 400 to 700).

### Hierarchy
- **Display** (750, clamp 52 to 96px, 0.95): The one hero headline per page. Balanced wrapping.
- **Headline** (750, clamp 34 to 52px, 1.0): Section heads.
- **Title** (700, 22px, 1.2): Sub-section heads and card titles; 16 to 18px Display 700 for small card and definition titles.
- **Price** (750, 56px, tabular): Deal prices and headline money. The dashboard's won-back figure runs at 64px; inline deal amounts at 22px. List prices beside a deal sit at 500, 24px, Muted Plum, struck through at 2px.
- **Lead** (400, 19px, 1.55, Muted Plum): One-paragraph intros under a section head, max 62ch.
- **Body** (400, 16px, 1.55): Running text, max 70ch. UI text at 13 to 15px.
- **Label** (600, 12px, 0.06em, uppercase): Table column headers (11px) and the small Do/Don't and status tags. Not used as a kicker above headlines.

### Named Rules
**The Tabular Price Rule.** Every price and changing figure uses tabular figures so it never jumps as it changes.

**The Ink Price Rule.** The deal price is Blackberry Ink (or white on Jam), never red; the saving is shown by a struck-through list price in Muted Plum.

## Layout

Content sits in a centred container up to 1320px wide with 32px side padding (16px below 900px). Text measures are capped (lead 62ch, body 70ch). Sections are separated by a 1px Rule hairline with 72px top padding (48px on small screens). Grids are simple equal-column grids (2, 3, 4 or 5 columns) with 12 to 20px gaps; at 1100px five- and three-part comparisons drop to two or one column, and at 900px everything stacks to a single column (palettes and logo variants keep two). Typographic definition rows (a 2px Ink top rule, a Display title, a muted description) are preferred over card grids for lists of principles. Spacing steps observed: 8, 12, 16, 24, 32, 56, 72px.

## Elevation & Depth

A hybrid of tonal layering and one soft shadow. The default depth is white on blush. Raised panels carry a single ambient shadow made of a 1px Rule base line plus a long, very soft Blackberry-tinted falloff; most smaller cards use only the 1px base line. Jam surfaces carry no shadow; their depth is colour. Ghost elements use a 1px inset stroke rather than a border. Nothing uses glass, backdrop blur or coloured halos.

### Shadow Vocabulary
- **Soft lift** (`box-shadow: 0 1px 0 #F1DFE3, 0 24px 60px -36px rgba(31,10,36,.32)`): Hero stage and main panels.
- **Base line** (`box-shadow: 0 1px 0 #F1DFE3`): Flat cards, swatches, rule tiles, chat-free panels.
- **Inset stroke** (`box-shadow: inset 0 0 0 1px #F1DFE3`): Ghost buttons and chip links; hover swaps the stroke to Ink or Berry.
- **Field focus** (`box-shadow: 0 0 0 3px rgba(224,20,111,.18)` with a Berry border): Text inputs only.

### Named Rules
**The Glaze, Not Glow Rule.** Drops get a soft sugar-glaze highlight (a white radial highlight, 60% to 0% opacity, offset to the upper left). No neon halos, glassmorphism or blurred colour glows around elements. The melt's goo filter (a blur that is alpha-thresholded back to a crisp edge) is how two drops merge and is part of the world.

## Shapes

Rounded and confectionery. Radii step 10px (small), 12px (fields), 16px (cards, swatches, chat bubbles), 24px (panels, tiles), 28px (Jam bands), 32px (the hero stage), and full pills for buttons, chips, status and track lanes. Chat bubbles keep a 5px tail corner on the speaker's side. Drops are circles. The Agent Tag is the only angular silhouette: a rounded price tag rotated -35 degrees, on a 64-unit grid, with an eye of radius 7 and a pupil of radius 3.4. Borders are rare: hairline Rule dividers, 1px field strokes and the 2px Ink top rule on definition rows.

## Components

Soft, pill-shaped and calm at rest; one confident colour per action.

### Buttons
- **Shape:** Full pill (999px), 12px 20px padding, Funnel Sans 600 15px, optional 8px icon gap.
- **Primary:** Jam with white text for every ordinary primary action ("Add Sweetspot to your shop", "Publish rules"). Hover deepens to Jam Deep.
- **Deal:** Berry with white text, reserved for agreeing a deal ("Accept $214.00"). Hover deepens to Berry Deep.
- **Ghost:** White with a 1px Rule inset stroke and Ink text; hover darkens the stroke to Ink.
- **Pressed / loading / disabled:** Press scales to 0.97 (120ms ease-out). Loading shows a 14px white spinner beside the label ("Saving rules"). Disabled is Disabled Fill with Muted Plum text and no shadow.
- **Focus:** 2px Berry outline, 3px offset, across all interactive elements.

### Chips (status)
- **Style:** Pill, 13px 600, 4px 10px, a 7px dot in the current colour, always paired with a word.
- **States:** Paid (Leaf Ink on #EEF5E2), Live (#B0105A on #FCE3EE), Held for shopper (Plum on #EEE6F7), No deal (Muted Plum on #F2EAEE).

### Cards / Containers
- **Corner Style:** 16px for small cards, 24px for panels, 28px for Jam bands.
- **Background:** White on Blush; Jam for headline money and banded rule sections (white headings, #F6D9E3 body text, Leaf Light for money).
- **Shadow Strategy:** Soft lift for primary panels, base line for the rest (see Elevation & Depth).
- **Internal Padding:** 16 to 18px small cards, 24px panels, 32px Jam bands.

### Inputs / Fields
- **Style:** White, 1px Field Stroke, 12px radius, 11px 14px padding, Funnel Sans 500 16px; label above at 14px.
- **Focus:** Berry border plus a 3px translucent Berry ring.
- **Error:** Jam border and a Jam 13px message in plain language that says what happened and how to fix it.

### Navigation
- **Style:** A quiet text index in Muted Plum 14px, 6px 10px padding, 10px radius; hover and current item take Ink text on Tint. The brand lockup sits above it in Funnel Display 700. Below 900px it becomes a sticky horizontal strip on Blush with a Rule bottom border.

### Negotiation Track (signature)
The defining component. Two glazed drops (coral shopper, plum shop) sit on a track; price chips ride in their own lane above it so text never overlaps the drops. A lowball offer gets a small squash-and-nudge back; each counter slides the drops closer (ease-spring, 1,100ms); on a deal they melt into one berry drop with a single Berry ripple, then everything goes still.

### Agent Tag (living logo)
The eye is the agent's state: idle blinks every 4 to 6s, glances toward the shopper while waiting, tilts gently while thinking, and on a deal closes into a smile with one small hop (ease-pop). It also serves as the loading state. In agent-vs-agent views each agent gets an Agent Tag in its party colour. Logo files: full-colour mark, one-colour Ink / Jam / white, lockups on light and dark, a 16px favicon with a bigger eye and no glaze, and an app icon on a Jam rounded square. Smallest full mark is 24px; clear space is one eye diameter.

### Shopper Chat (white-labelled)
Takes the shop's own fonts and colours; Sweetspot contributes only the behaviour, the deal card and a small 12px "Negotiated by Sweetspot" badge with the mark. Bubbles are 16px with a 5px speaker-side tail, 9px 13px padding, max 84% width, entering with a 450ms ease-out rise. The deal card (14px radius, deal amount in Funnel Display 750 22px, hold timer) and the PayPal button appear only once a price is agreed. The message list is a log live region.

### Merchant Dashboard figures
Money won back is the headline, in Jam: a 64px tabular figure on a Jam card, Leaf Light for the gain, a three-up row of secondary figures. Tables use 11px uppercase Muted Plum headers, Rule row lines, right-aligned tabular numbers and a #FFF1F4 row hover. Demo figures are always labelled as demo data.

### Motion
Motion tells the story of the negotiation, with one authored moment per screen. Easing: ease-out `cubic-bezier(.16,1,.3,1)` for entrances (240 to 450ms), ease-spring `cubic-bezier(.34,1.4,.64,1)` for drops travelling (1,100ms), ease-pop `cubic-bezier(.34,1.56,.64,1)` for the melt, eye smile and deal stamp (500 to 600ms). The deal choreography runs: accepting bubble (0ms), drops slide (200ms), melt and ripple (900ms), eye smiles and tag hops (1,100ms), deal card and PayPal button rise (1,300ms) and screen readers hear "Deal agreed at $X". Under reduced motion drops jump to position, the melt becomes a cross-fade, the eye stops blinking and nothing loops.

## Do's and Don'ts

### Do:
- **Do** put Sweetspot-branded screens on Blush (#FFF7F6) with white panels and Jam (#7A0E3A) as the only deep surface.
- **Do** use Jam for ordinary primary actions and Berry (#E0146F) only for agreeing a deal.
- **Do** keep coral the shopper, plum the shop agent, berry the deal and leaf money won, and label each party in words too.
- **Do** set every price in tabular figures, with the deal price in Ink and the list price struck through in Muted Plum.
- **Do** pair status colour with a word, and meet WCAG 2.2 AA: body text at least 4.5:1, drops and UI shapes at least 3:1.
- **Do** let the shopper chat take on the shop's own look, adding only the "Negotiated by Sweetspot" badge.
- **Do** render PayPal buttons through PayPal's SDK, revealed only after a price is agreed.
- **Do** give every animation a still equivalent under reduced motion.

### Don't:
- **Don't** use the coral to berry to plum gradient anywhere except the deal drop and the logo: not on backgrounds, buttons, cards or text.
- **Don't** use near-black or navy for deep surfaces; use Jam.
- **Don't** use electric or blue-leaning AI violets; Plum (#5A1E8C) is the only purple.
- **Don't** use gold, yellow or PayPal blue in Sweetspot UI, and never restyle PayPal's buttons.
- **Don't** put white text on Coral.
- **Don't** add neon halos, glassmorphism, backdrop blur or coloured glows; drops get glaze, not glow.
- **Don't** rotate the Agent Tag level, re-angle it, recolour it outside the palette, add a face or extra features, or add glows, shadows or effects to it.
- **Don't** use Leaf as decoration or as a generic success colour.
- **Don't** animate for decoration: nothing drifts or loops without meaning, and a locked deal gets one final moment, then stillness.

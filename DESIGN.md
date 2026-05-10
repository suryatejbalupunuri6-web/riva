# Design Brief

## Direction

Riva — Modern hyperlocal delivery platform with premium startup aesthetic inspired by Zepto/Blinkit, built for high conversion and modern Indian consumers.

## Tone

Confident, high-energy, clean. Bold green CTAs with strong visual hierarchy. No-nonsense efficiency with friendly product-first navigation — intentionally maximalist about conversion, minimal about decoration.

## Differentiation

Solid, visible green CTAs (never transparent), dark hero overlay ensuring text legibility on all devices, premium product cards with clear pricing hierarchy (bold green discount, grey strikethrough original), and seamless category-first experience designed for APK/WebView reliability.

## Color Palette

| Token                | OKLCH             | Role                           |
|----------------------|-------------------|--------------------------------|
| background           | 0.99 0.003 260    | Clean light base               |
| foreground           | 0.13 0.02 260     | Dark text for readability      |
| card                 | 1.0 0.0 0         | White product/category cards   |
| primary              | 0.52 0.22 142     | Vibrant green (#16a34a)        |
| primary-foreground   | 1.0 0.0 0         | White text on green            |
| secondary            | 0.94 0.008 260    | Light grey section dividers    |
| muted                | 0.92 0.006 260    | Ultra-light backgrounds        |
| muted-foreground     | 0.48 0.01 260     | Tertiary text (store names)    |
| accent               | 0.52 0.22 142     | Same as primary (green)        |
| destructive          | 0.54 0.21 25      | Error red                      |
| success              | 0.52 0.22 142     | Success green                  |
| warning              | 0.72 0.15 80      | Warm yellow warnings           |
| border               | 0.88 0.008 260    | Light dividers                 |

## Typography

- Display: Space Grotesk — bold, tech-forward headings for hero and category titles
- Body: Satoshi — friendly, highly readable sans-serif for product names, prices, labels
- Scale: Hero `text-5xl md:text-7xl font-bold tracking-tight`, h2 `text-3xl md:text-4xl font-bold`, labels `text-sm font-semibold`, body `text-base`

## Elevation & Depth

Subtle shadows on cards (0.08–0.1 opacity black) with hover states (0.12 opacity). Hero and product cards use `shadow-card`, interactive buttons add `shadow-sm` on hover. No blur, no glassmorphism — solid layers only.

## Structural Zones

| Zone        | Background            | Border            | Notes                                        |
|-------------|-----------------------|-------------------|----------------------------------------------|
| Header      | White (card)          | Light grey bottom | Clean top nav, green accents on logo         |
| Hero        | Image + 50% dark      | None              | Dark overlay ensures text legibility         |
| Categories  | White/light grey      | None              | Horizontal premium icon cards with labels    |
| Products    | White background      | Light grey subtle | Grid of rounded cards with shadows           |
| CTA Buttons | Solid green (#16a34a) | None              | White text, no transparency, rounded 8px     |
| Footer      | Light muted grey      | Light grey top    | Subtle, secondary information                |

## Spacing & Rhythm

Hero: 2rem top/bottom padding. Categories: 1.5rem gap between cards, 1rem vertical margins. Products: 1rem gap (compact grid), 2rem section gaps. Buttons: 0.75rem–1rem padding. Micro-spacing creates visual rhythm without dense clustering.

## Component Patterns

- Buttons: Solid green (#16a34a), white text, 8px rounded, no transparency. Hover adds shadow (0 2px 4px). Active reduces shadow.
- Cards: Rounded 8px, white background, subtle shadow (0.08 opacity), hover shadow (0.1 opacity). Product price: bold green price + grey strikethrough original.
- Categories: Icon + label on rounded 12px background, horizontal scroll, light grey hover state.
- Price: `<span class="font-bold text-primary">₹30</span> <span class="text-muted-foreground line-through">₹50</span>` — only show original if discounted.

## Motion

- Entrance: Fade-in 0.3s on page load, slide-in-bottom for modals
- Hover: Button shadow deepens 0.2s, card background subtle shift
- Decorative: None — focus on functional clarity for conversion

## Constraints

- No transparency on buttons or text (solid fills only)
- No blur, glassmorphism, or layered effects — APK/WebView safe
- Hero overlay: 50% black (`oklch(0 0 0 / 0.5)`)
- Radius: 8px standard (buttons, small cards), 12px premium (categories)
- All interactive elements fully visible with high contrast

## Signature Detail

Dark hero overlay + vibrant green CTAs create instant visual clarity and trustworthiness for hyperlocal commerce — distinctly Zepto/Blinkit-inspired but executed with premium restraint and APK reliability.


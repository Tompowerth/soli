# SOLI — Brand Guide v1.0

## Brand Identity
- **Name**: SOLI
- **Tagline**: "Hey, Soli."
- **Domain**: heysoli.ai
- **Meaning**: "Mine" in Italian — because she's yours. Your advisor. Always.
- **Personality**: Warm, present, perceptive, honest, playful when appropriate, never preachy.

## Color Palette — Lavender & Blush

### Primary
| Name           | Hex       | Usage                    |
|----------------|-----------|--------------------------|
| Soft Lavender  | `#B8A9C9` | Buttons, headers, CTA    |
| Blush Pink     | `#E8B4B8` | Accents, highlights, CTA |

### Secondary
| Name           | Hex       | Usage                    |
|----------------|-----------|--------------------------|
| Soft Sky       | `#A7C7D9` | Info elements, links     |
| Deep Lavender  | `#8E7BA8` | Headings, strong text    |

### Backgrounds
| Name           | Hex       | Usage                    |
|----------------|-----------|--------------------------|
| Warm White     | `#FAF6F0` | Main background          |
| Light Lilac    | `#F0E6F0` | Cards, sections, surfaces|

### Text
| Name           | Hex       | Usage                    |
|----------------|-----------|--------------------------|
| Dark Plum      | `#3D3252` | Body text, primary       |
| Muted Rose     | `#C49296` | Subtitles, captions      |
| Text Muted     | `#9B8FA8` | Hints, disabled, notes   |

### Gradient
- Logo gradient: `linear-gradient(135deg, #B8A9C9, #E8B4B8)`
- Hero orb glow: `radial-gradient(circle, rgba(184,169,201,0.15), transparent)`

## Typography

### Headings
- **Font**: Cormorant Garamond
- **Weights**: 300 (light), 400 (regular), 500 (medium)
- **Style**: Elegant, serif, slightly editorial
- **Usage**: All headings, logo wordmark, section titles

### Body
- **Font**: DM Sans
- **Weights**: 300 (light for body), 400 (regular), 500 (medium for emphasis)
- **Style**: Clean, modern, friendly sans-serif
- **Usage**: Body text, buttons, UI elements, navigation

### Sizing
| Element          | Size (mobile)        | Size (desktop)        |
|------------------|----------------------|----------------------|
| H1 (hero)        | 42px                 | 72px                 |
| H2 (section)     | 28px                 | 40px                 |
| H3 (card)        | 20px                 | 24px                 |
| Body             | 15px                 | 17px                 |
| Caption/note     | 12-13px              | 13-14px              |
| Button           | 14-15px              | 15-16px              |

## Logo

### Icon
- Gradient circle (Lavender → Blush) with serif "S" in warm white (#FAF6F0)
- 512x512 for app icon, scales to any size
- File: `assets/logos/soli-logo.svg`

### Wordmark
- Icon + "SOLI" in Cormorant Garamond, letter-spacing: 3-6px, color: Deep Lavender (#8E7BA8)
- File: `assets/logos/soli-logo-wordmark.svg`

### Full
- Icon + "SOLI" + "Hey, Soli." tagline in italic Muted Rose
- File: `assets/logos/soli-logo-full.svg`

### Logo Rules
- Minimum size: 32px (icon only), 120px (with wordmark)
- Clear space: at least 50% of logo height on all sides
- Never stretch, rotate, or change colors
- On dark backgrounds: use white text, keep gradient icon

## UI Elements

### Buttons
- **Primary**: Lavender bg (#B8A9C9), white text, pill shape (border-radius: 50px), 16px padding
- **Secondary**: Transparent bg, Lavender border, Deep Lavender text
- **Hover**: Darken to Deep Lavender (#8E7BA8), slight lift (translateY -2px)
- **Shadow on primary**: `0 8px 32px rgba(184,169,201,0.3)`

### Cards
- White background (#FFFFFF)
- Border: 1px solid rgba(184,169,201,0.15)
- Border-radius: 16px
- Hover: lift + shadow + border color change to Lavender
- Top accent line (3px) in rotating colors: Lavender → Blush → Sky → Deep Lavender

### Inputs
- Background: Warm White (#FAF6F0)
- Border: 1.5px solid rgba(184,169,201,0.3)
- Focus: border Lavender + glow ring rgba(184,169,201,0.15)
- Border-radius: 50px (pill)

## Orb Animation (Speaking Mode)
- Logo centered on screen
- 3 concentric aura rings expand/contract with audio amplitude
- Ring opacity pulses: 0.06 → 0.15 based on voice volume
- Ring colors: inner = Lavender, middle = Blush, outer = Lavender
- 3 modes: Calm (gentle breathing), Speaking (bass pulse), Emotional (deep waves)

## Voice & Tone (in UI copy)
- Warm, personal, never clinical
- Second person: "You look tired" not "User fatigue detected"
- Questions over statements: "How are you feeling?" not "Status: anxious"
- Playful when appropriate: "Hey, Soli." not "Welcome to SOLI AI Platform"

## Accessibility
- All text must pass WCAG AA contrast (4.5:1)
- Dark Plum (#3D3252) on Warm White (#FAF6F0) = 8.2:1 ✓
- Deep Lavender (#8E7BA8) on Warm White = 4.1:1 ⚠️ (use only for large text / headings)
- Soft Lavender (#B8A9C9) on white = 2.8:1 ✗ (never for body text — buttons/icons only)

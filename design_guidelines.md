# Design Guidelines for Profe ELE – IA Voz

## Design Approach
**Application Type**: Specialized voice interaction widget - A focused, single-purpose conversational interface
**Design Philosophy**: Clean, minimal interface that prioritizes the voice conversation experience with subtle visual feedback and non-intrusive correction cards

## Layout & Structure

**Widget Container**
- Fixed dimensions: 380px × 680px
- Border-radius: 24px
- Shadow: `0 18px 45px rgba(0,0,0,.12)`
- Background: Very light gray `#F6F7F9`

**Three-Section Layout**:
1. Header (fixed top, ~56px)
2. Chat area (scrollable, flex-grow)
3. Footer (fixed bottom with mic control)

## Typography
- **Title**: Sans-serif, weight 600-700, white on navy
- **Chat bubbles**: Clear, readable sans-serif
- **Correction card labels**: 12px labels, weight 600
- **Correction text**: Readable size with visual emphasis via underlines

## Component Specifications

### Header
- Height: 56px
- Background: Navy blue `#182539`
- Left: "Profe ELE – IA Voz" title (white, 600-700 weight)
- Right: Status indicator dot (gray default, green `#3CC47C` when connected) + Settings gear button (ghost style)

### Chat Area
- Background: `#F6F7F9`
- Overflow-y: auto
- **Assistant messages**: Left-aligned bubbles, mustard background `#F1C75B`, soft shadow
- **User messages**: Right-aligned bubbles, white background with `#E0E0E0` border
- **Initial message**: "Hola, soy tu profesor virtual. ¡Hablemos!"

### Microphone Button
- Circular shape
- Color: Terracotta `#E25A2C` (CSS variable `--ia-mic`)
- **Active state**: Animated concentric wave ripples emanating outward
- Position: Center of footer

### Correction Card (`.iav-correction-card`)
- Background: White
- Shadow: `0 6px 16px rgba(0,0,0,.12)`
- Border-radius: 12px
- **Left stripe**: Vertical accent 6-8px wide, terracotta `#E25A2C` (same as mic)
- Margins: 8-12px vertical
- Internal gap between rows: 4-6px

**Card Structure**:
- **Title row**: "Correction" (12px, `#444`, weight 600)
- **Error row**: Red X icon `✕` `#C7442E`, label "Dijiste:" (bold), red underlined text
- **Fix row**: Green check `✔` `#1A7C4A`, label "Mejor di:" (bold), green underlined text  
- **Reason row**: Bulb emoji `💡`, label "Por qué:" (bold), italic text in medium gray `#555`

## Spacing System
Use consistent spacing for:
- Chat bubble padding: 12-16px
- Message vertical gaps: 8-12px
- Card internal padding: 12-16px
- Footer padding: 16-20px

## Interactive States
- **Mic button**: Visual wave animation when speaking detected
- **Connection status**: Dot transitions gray → green
- **Scrolling**: Auto-scroll to bottom on new messages
- **Audio element**: Hidden `<audio autoplay>` for assistant voice

## Images
No images required - this is a text/voice-focused conversational interface with iconography only (status dots, correction card icons).
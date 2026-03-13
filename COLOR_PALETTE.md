# Spanish App Color Palette

## Exact Colors Used

| Color Name | Hex Code | Tailwind Class | Usage |
|------------|----------|----------------|-------|
| **Rosa Principal** | `#F5B2E1` | `rosa-principal` | Buttons, active states, highlights, accents |
| **Rosa Claro** | `#F9D4EE` | `rosa-claro` | Main background, light sections, cards |
| **Negro de Fondo** | `#111111` | `negro-fondo` | Sidebar, dark backgrounds, auth page |
| **Gris Oscuro** | `#1C1C1C` | `gris-oscuro` | Dark cards, secondary dark backgrounds |
| **Gris Medio** | `#2E2E2E` | `gris-medio` | Hover states, medium backgrounds, inputs |
| **Blanco de Texto** | `#F0F0F0` | `blanco-texto` | Primary text on dark backgrounds |
| **Gris de Texto Atenuado** | `#A0A0A0` | `gris-atenuado` | Secondary text, muted text, descriptions |

## CSS Variables (in index.html)

```css
:root {
  --rosa-principal: #F5B2E1;
  --rosa-claro: #F9D4EE;
  --negro-fondo: #111111;
  --gris-oscuro: #1C1C1C;
  --gris-medio: #2E2E2E;
  --blanco-texto: #F0F0F0;
  --gris-atenuado: #A0A0A0;
}
```

## Tailwind Configuration (in index.html)

```javascript
tailwind.config = {
  theme: {
    extend: {
      colors: {
        'rosa-principal': '#F5B2E1',
        'rosa-claro': '#F9D4EE',
        'negro-fondo': '#111111',
        'gris-oscuro': '#1C1C1C',
        'gris-medio': '#2E2E2E',
        'blanco-texto': '#F0F0F0',
        'gris-atenuado': '#A0A0A0',
      }
    }
  }
}
```

## Usage Examples

### Backgrounds
- `bg-rosa-principal` - Main pink background (buttons, active states)
- `bg-rosa-claro` - Light pink background (main content area)
- `bg-negro-fondo` - Black background (sidebar, auth page)
- `bg-gris-oscuro` - Dark gray background (cards on dark backgrounds)
- `bg-gris-medio` - Medium gray background (inputs, hover states)

### Text Colors
- `text-rosa-principal` - Main pink text (headings, links)
- `text-blanco-texto` - White text (text on dark backgrounds)
- `text-negro-fondo` - Black text (text on light backgrounds)
- `text-gris-atenuado` - Muted gray text (descriptions, secondary text)

### Borders
- `border-rosa-principal` - Pink borders
- `border-rosa-principal/20` - Pink borders with 20% opacity

## Component Color Mapping

| Component | Background | Text | Accent |
|-----------|------------|------|--------|
| **Sidebar** | `negro-fondo` | `blanco-texto` | `rosa-principal` |
| **Dashboard** | `rosa-claro` | `negro-fondo` | `rosa-principal` |
| **Auth Page** | `negro-fondo` | `blanco-texto` | `rosa-principal` |
| **Account Page** | `rosa-claro` | `negro-fondo` | `rosa-principal` |
| **Cards** | `rosa-claro` | `negro-fondo` | `rosa-principal` |
| **Buttons** | `rosa-principal` | `negro-fondo` | - |

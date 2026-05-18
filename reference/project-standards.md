# PLENROEMSC Application Standards Reference

When working on this project or generating new applications based on this structure, you **MUST** adhere to the following technological choices, design patterns, and library standards.

## 1. Core Tech Stack
- **Framework:** React 19 with Vite (`type: module`)
- **Routing:** `react-router-dom`
- **Styling:** Tailwind CSS (v3.4+)
- **Icons:** `react-icons`

## 2. UI Component Libraries
To maintain the visual aesthetic of the PLENROEMSC application, rely exclusively on these libraries rather than building complex components from scratch:
- **Tremor (`@tremor/react`):** Use for dashboards, charts, metric cards, and layout elements.
- **Radix UI Primitives:** Use for accessible interactive elements:
  - `@radix-ui/react-dialog` (Modals/Popups)
  - `@radix-ui/react-select` (Dropdowns)
  - `@radix-ui/react-checkbox` (Checkboxes)
  - `@radix-ui/react-switch` (Toggles)
- **Tables:** Use `@tanstack/react-table` for data grids.

## 3. Styling & Animation Guidelines
- **Tailwind Plugins:** Always use `@tailwindcss/forms` for consistent input styling.
- **Animations:** Radix UI and custom animations are configured in `tailwind.config.js`. Use the pre-configured utility classes:
  - `animate-slideDownAndFade`, `animate-slideUpAndFade`
  - `animate-dialogContentShow`, `animate-dialogOverlayShow`
  - `animate-accordionOpen`, `animate-accordionClose`

## 4. Code Style & Formatting
- **Linting & Formatting:** ESLint (v9) and Prettier.
- **File Extensions:** Use `.jsx` for React components.
- **Component Structure:** Use functional components and React Hooks.

## 5. Development Instructions for Agents
When an AI agent starts a new session or creates a new component:
1. Always check `tailwind.config.js` for custom colors and keyframes before adding arbitrary values.
2. If a UI component is needed (e.g., a chart, a data table, a modal), first check if Tremor or Radix UI provides a primitive for it.
3. Keep logic and API calls separated from the pure UI presentation where possible.

# Tag Flow Editor

Visual ECS-style flow editor built with Vue 3, TypeScript, VueFlow, Tailwind v4, and shadcn-vue.

## Features

- **Tag catalog** with types: Data, Marker, State, Relation, Timer
- **Systems** as group nodes (query + actions) wired into a **Flow**
- **Drill-down editing**: double-click a system to edit its internal graph
- **Actions**: Text (log message) and Add Tags
- **Inspector** panel for editing selected nodes
- **Persistence**: auto-save to localStorage, Export/Import JSON

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Usage

1. **Tags** — manage tags in the left sidebar (grouped by type)
2. **Flow level** — view systems connected in execution order; add systems via header
3. **System level** — double-click a system to edit Query + Action nodes
4. **Inspector** — select a node to edit query conditions or action config
5. **Export/Import** — save and load flow documents as JSON

## Stack

- Vue 3 + TypeScript + Vite
- VueFlow (graph canvas)
- Pinia (state)
- Tailwind CSS v4
- shadcn-vue / reka-ui (UI components)

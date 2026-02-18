# Project Structure: Modular Pixel World

This structure emphasizes **separation of concerns** and **modularity**.

```
gather-town/
├── apps/
│   ├── client/
│   │   ├── public/
│   │   │   └── data/           # <--- DATA DRIVEN (JSON Configs)
│   │   │       ├── items.json
│   │   │       └── styling.json
│   │   ├── src/
│   │   │   ├── core/           # <--- THE ENGINE (Stable, rarely changes)
│   │   │   │   ├── events/     # Event Bus
│   │   │   │   ├── network/    # Socket Client
│   │   │   │   └── store/      # Global State (Zustand)
│   │   │   ├── features/       # <--- THE MODULES (Plug & Play)
│   │   │   │   ├── avatar/     # Avatar Creator logic & UI
│   │   │   │   ├── world/      # Map & Movement logic
│   │   │   │   ├── chat/       # Chat system
│   │   │   │   └── ui/         # Shared UI Components (Buttons, Panels)
│   │   │   ├── hooks/          # Shared React Hooks
│   │   │   └── utils/
│   │   └── ...
│   └── server/
│       ├── src/
│       │   ├── core/           # Server Engine
│       │   └── modules/        # Server Logic (mirroring client features)
│       └── ...
└── ...
```

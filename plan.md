# Implementation Plan: Modular Pixel World

This document is the **Master Directive** for the AI Agent implementing this project.
**Objective**: Build a pixel-art virtual world (Gather.town style) with a modular, high-fidelity character creator (Humation style UX).

---

## 🏗️ Architecture & Standards

### 1. The Rule of Modularity
*   **Core vs. Features**:
    *   **Core** (`apps/client/src/core/`): Engine logic (GameLoop, EventBus, Socket). **Do not modify unless necessary.**
    *   **Features** (`apps/client/src/features/`): All game logic (Avatar, Chat, Map). **Work happens here.**
*   **Small Impact Edits**:
    *   Adding content (new hair, new shirt) MUST be done via **JSON Config + Asset File**. No code changes.
    *   Feature logic MUST be isolated. If you delete `apps/client/src/features/chat`, the rest of the app MUST still work.

### 2. File Structure
```
apps/client/
├── public/data/           # JSON Configs (The "Database")
├── src/features/
│   ├── avatar/            # Character Creator Feature
│   │   ├── components/    # React Components
│   │   ├── assets/        # Local assets (if strictly UI)
│   │   └── logic.ts       # Non-UI Logic
│   └── world/             # Phaser Game Feature
└── src/core/              # Shared Utilities (EventBus)
```

### 3. Communication
*   **Events**: Use `core/events/EventBus.ts` for cross-feature communication.
    *   `AvatarFeature` emits `AVATAR_CHANGED`.
    *   `WorldFeature` listens to `AVATAR_CHANGED` to update the sprite.

---

## 🚀 Implementation Roadmap

### Phase 1: The Character Creator (Immediate Priority)
**Goal**: A standalone React UI to generate a composite pixel-art avatar.

#### Step 1.1: Project Initialization
*   [ ] Initialize `apps/client` with Vite + React + TypeScript.
*   [ ] Initialize `apps/server` with Node.js + TypeScript.
*   [ ] Set up Tailwind CSS for styling (Humation-like clean UI).

#### Step 1.2: The Data Layer
*   [ ] Create `public/data/avatar_manifest.json`.
    *   Structure: `{ "categories": ["hair", "body"], "items": { "hair": [...] } }`.
*   [ ] Create a utility to fetch and parse this JSON.

#### Step 1.3: The Rendering Engine (Canvas)
*   [ ] Create `AvatarRenderer` component.
*   [ ] Implement "Layering" system:
    *   Draw `Body` -> Draw `Clothes` -> Draw `Hair` -> Draw `Accessories`.
*   [ ] Implement "Color Replacement" (if using white-mask sprites).

#### Step 1.4: The UI (Humation Style)
*   [ ] Create a side panel with Tabs (Body, Hair, Outfit).
*   [ ] Grid view of items from `avatar_manifest.json`.
*   [ ] Clicking an item updates the `AvatarRenderer`.

### Phase 2: The Virtual World (Next Steps)
**Goal**: Walk around with the avatar.

#### Step 2.1: Phaser Integration
*   [ ] Install `phaser`.
*   [ ] Create `GameView` component to mount Phaser.
*   [ ] Create a basic `MainScene`.

#### Step 2.2: Avatar Injection
*   [ ] Convert the React-generated Avatar (Canvas) into a Texture/Base64.
*   [ ] Pass this texture to Phaser to use as the Player Sprite.

#### Step 2.3: World Logic
*   [ ] Implement Tilemap loading.
*   [ ] Implement WASD movement.

---

## 🛠️ Tech Stack
*   **Frontend**: React, Zustand (State), Phaser (Game), Tailwind (UI).
*   **Backend**: Node.js, Socket.io (for Phase 3).
*   **State**: Data-driven JSONs.

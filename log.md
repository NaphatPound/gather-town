# Change Log

## Session — 2026-02-18

### 1. Interactive Map Objects (Feature)
- Added full object system: catalog (`object_manifest.json`), placements (`map_objects.json`), procedural pixel-art renderer, proximity detection, and X-key interaction
- New files: `objects/types.ts`, `objectManifest.ts`, `ObjectRenderer.ts`, `ObjectManager.ts`, `ProximityDetector.ts`
- React UI: `InteractionPrompt.tsx`, `NoteModal.tsx`, `LinkModal.tsx`, `ImageModal.tsx`, `InteractionOverlay.tsx`
- Added 4 EventBus events: `OBJECT_PROXIMITY_ENTER/EXIT`, `OBJECT_INTERACT`, `OBJECT_INTERACTION_CLOSE`
- Wired into `MainScene.ts` and `GameView.tsx`
- Added door to building at tile (16,5) and path tile at (16,6)
- Default objects: welcome sign, desk, chair, monitor, bookshelf, TV, plant, lamp

### 2. Fix: Objects not rendering (Bug Fix)
- Switched `ObjectRenderer.ts` from Canvas `addCanvas` to Phaser `Graphics.generateTexture` (compatible with Phaser 3.90)
- Fixed race condition: ObjectManager now only initializes after scene restart (gated by `avatarDataURL`)
- Added error handling with `try/catch` in `ObjectManager.init()`

### 3. Camera zoom 2x (Enhancement)
- Added `this.cameras.main.setZoom(2)` in `MainScene.ts` for better pixel-art visibility

### 4. Fix: Player size to match assets (Bug Fix)
- Changed player scale from hardcoded `0.5` to `TILE_SIZE / img.width` (192px avatar → 32px sprite)

### 5. Player name input (Feature)
- Added name text input to `CharacterCreator.tsx` (max 16 chars, defaults to "Guest")
- Passed `playerName` through EventBus → `App.tsx` → `GameView.tsx` → `MainScene.ts`
- Replaced hardcoded "You" label with player's chosen name

### 6. Reduce name label size (Enhancement)
- Shrunk in-game name font from 12px to 7px, reduced padding and offset to fit 2x zoom

### 7. Fullscreen toggle (Feature)
- Added "Fullscreen" button to `GameView.tsx` toolbar
- Clicking toggles browser fullscreen on the game wrapper (game + interaction overlay)
- Uses native `requestFullscreen` / `exitFullscreen` API

### 8. Fix: Slow border resize on game start (Bug Fix)
- Eliminated scene restart pattern — `MainScene` now receives `avatarDataURL` and `playerName` via constructor instead of `scene.scene.restart()`
- Game boots once with all data ready, removing the visible shrink/resize flash
- Added `cameras.main.centerOn()` to snap camera to player position instantly before enabling smooth follow (prevents slow pan from origin)

### 9. Multiplayer — Other Players Can Connect to Same Room (Feature)
- **Server** (`apps/server/src/index.ts`): Fixed CORS to accept any `localhost:*` port; added `Map<string, PlayerData>` for player tracking; full protocol: `player:join` → `players:existing` + `player:joined`, `player:move` → `player:moved`, disconnect → `player:left`
- **Client dependency**: Installed `socket.io-client` in `apps/client`
- **NetworkService** (`apps/client/src/core/network/NetworkService.ts`): Singleton wrapping socket.io-client with typed events, throttled `sendMove()` (10/sec, skips if position unchanged), `connect()`/`disconnect()`/`joinGame()` lifecycle
- **RemotePlayerManager** (`apps/client/src/features/world/RemotePlayerManager.ts`): Manages remote player sprites + name labels, lerp interpolation (0.15/frame) for smooth movement, texture cleanup on removal
- **MainScene** wiring: Subscribes to all network events in `create()`, sends position in `update()`, cleans up on `shutdown`
- **GameView** wiring: Calls `networkService.connect()` on mount, `disconnect()` on unmount

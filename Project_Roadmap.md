# Project Roadmap: Pixel Art Virtual World

## Phase 1: The Character Creator (The "Humation" Aspect)
**Goal**: A standalone web app to create and export pixel art avatars.
- [ ] **Design Assets**: Create a standard body template (e.g., 32x32 or 48x48).
- [ ] **Asset Library**: Draw variations for eyes, hair, clothes.
- [ ] **UI Implementation**: Build a React interface to select parts.
- [ ] **Canvas Rendering**: Use HTML5 Canvas to layer the selected parts in real-time.
- [ ] **Export**: Allow users to download the resulting sprite (and potential spritesheets for animation).

## Phase 2: The Virtual World (The "Gather.town" Aspect)
**Goal**: Walk around with the created avatar.
- [ ] **Game Engine Setup**: Initialize a Phaser.js or React-Game-Engine project.
- [ ] **Map Design**: Create a simple tile-based map (using Tiled or similar).
- [ ] **Player Movement**: Implement 2D top-down movement.
- [ ] **Avatar Integration**: Load the custom avatar from Phase 1 into the engine.

## Phase 3: Multiplayer & Interaction
**Goal**: See other users.
- [ ] **Backend**: Set up a WebSocket server (Socket.io, Colyseus, or similar).
- [ ] **State Sync**: Sync player positions and current avatar configurations.
- [ ] **Chat/Video**: Add proximity-based interaction.

## Tech Stack Recommendation
- **Frontend**: React (for UI), Phaser (for Game Loop).
- **Backend**: Node.js + Socket.io (for MVP multiplayer).
- **Art Tools**: Aseprite.

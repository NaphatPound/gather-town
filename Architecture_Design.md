# Modular Architecture: "Plug-and-Play" System

To achieve "Small Impact" on edits, we will use a **Data-Driven** and **Feature-Based** architecture.

## Core Principle: "Core vs. Content" separation

1.  **The Core (Engine)**: The code that runs the system. You rarely change this.
2.  **The Content (Data/Features)**: The JSON files and Asset images you add. **You edit this frequently.**

## 1. Data-Driven Character Config (The "Plug" for Assets)
Instead of hardcoding "Blue Shirt" in React, we define it in a JSON definition. The app simply reads the JSON and renders what it says.

**File:** `data/character_registry.json`
```json
{
  "categories": ["hair", "eyes", "outfit"],
  "parts": {
    "hair": [
      { "id": "h001", "name": "Spiky", "src": "assets/hair/spiky.png", "tags": ["short"] },
      { "id": "h002", "name": "Long", "src": "assets/hair/long.png", "tags": ["long"] }
    ]
  }
}
```
**Impact of Change:**
- **To add a new hairstyle:** You specificially create 1 image and add 1 line to the JSON.
- **Result:** You do NOT touch any React code. The UI automatically updates to show the new option.

## 2. Feature-Based Directory Structure (The "Plug" for Logic)
Each "Feature" is a self-contained folder. If you delete the folder, the feature disappears cleanly, without breaking the app.

```
src/
├── core/                  # The "Motherboard" (Engine)
│   ├── EventBus.ts        # How features talk to each other
│   ├── GameLoop.ts
│   └── AssetLoader.ts
│
├── features/              # The "Plugins" (Content)
│   ├── CharacterCreator/  # Feature 1
│   │   ├── components/    # UI specific to this feature
│   │   ├── logic.ts       # Logic specific to this feature
│   │   └── manifest.json  # Assets for this feature
│   │
│   ├── Chat/              # Feature 2
│   │   ├── ChatBox.tsx
│   │   └── socket.ts
│   │
│   └── Map/               # Feature 3
```

## 3. Event-Driven Communication
Features do not call each other directly. They emit events.

- **Bad (High Impact)**: `CharacterCreator` imports `Player` and calls `Player.setSkin()`. (If Player changes, Creator breaks).
- **Good (Modular)**: `CharacterCreator` emits event `CHARACTER_UPDATED`. The `Player` module listens for it.

```typescript
// features/CharacterCreator/logic.ts
EventBus.emit('CHARACTER_STYLE_CHANGED', { part: 'hair', value: 'h002' });

// features/Player/logic.ts
EventBus.on('CHARACTER_STYLE_CHANGED', (data) => {
    mySprite.setTexture(data.value);
});
```

## Summary for "Small Impact"
| Action | Old Way | Modular Way |
| :--- | :--- | :--- |
| **Add Item** | Edit UI code, Import image, Edit Logic | **Add file to folder, Edit JSON** |
| **Remove Feature** | Search & Delete code in 5 files | **Delete 1 Folder** |
| **Change Asset** | Find specific variable in code | **Replace file on disk** |

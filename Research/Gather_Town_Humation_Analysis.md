# Project Analysis: Pixel Art Character Creator

## Vision
Create a character creation feature similar to **Gather.town** and **Humation.app**, but with a specific focus on **Pixel Art** style.

## Reference Breakdown

### Gather.town
- **Style**: Retro, SNES-like pixel art (32x32 tiles typically).
- **Features**:
    - Avatar customization (Skin, Hair, Facial Hair, Tops, Bottoms, Shoes, Accessories).
    - Color customization for individual parts.
    - Integrated into a 2D RPG-like world.
    - "Gamified" feel.
- **Takeaway**: A solid baseline for pixel art avatars.

### Humation.app
- **Style**: Modern, likely vector-based/high-resolution human illustrations. Not pixel art.
- **Features**:
    - **Modular System**: Highly combinable parts (Figma plugin mentioned).
    - **Clean UI**: distinct categories for body parts and accessories.
    - **Expression**: Focus on "Human Illustration System" implies a wide range of poses or expressions.
- **Takeaway**: The *user experience* and *modularity* of Humation should be applied to a Pixel Art aesthetic. Instead of simple static sprites, we might want a system that allows for:
    - easy swapping of parts.
    - dynamic coloring.
    - potentially more "modern" UI for the creator itself, even if the output is pixel art.

## Proposed Concept: "Pixel-Humation"
- **Visuals**: Pixel Art (e.g., 32px or 64px base).
- **Architecture**: Layered Sprite System.
    - Base Body
    - Eyes / Expressions
    - Hair (Front/Back layers)
    - Clothing (Top, Bottom, Shoes, Outerwear)
    - Accessories
- **Tech Stack Options**:
    - **Phaser**: Good if integrating into a full game immediately.
    - **HTML5 Canvas + React**: Best for a standalone UI heavy character creator (like a web app).

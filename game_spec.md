# Simple Tanuja Running Game Specification

Create a browser-based **endless runner** game similar to the Chrome offline dinosaur game, but with the following modifications:

## Main Concept
- The playable character is **Tanuja**, a girl running through a flat, side-scrolling environment.
- The background is simple and clean (solid color or light gradient).
- Tanuja runs automatically from left to right.
- The player controls **jumping** only.
- Obstacles appear in her path, and the goal is to survive as long as possible while avoiding them.

## Gameplay
- **Controls:**  
  - Spacebar or Up Arrow = Jump  
  - On mobile: tap to jump
- Obstacles include:  
  - Rickshaw  
  - Road barrier  
  - Stray dog  
- Jump timing determines whether Tanuja clears the obstacle or collides.
- Game ends immediately upon collision.

## Visual Details
- Tanuja sprite should clearly look like a girl (simple pixel art or cartoon style).
- Obstacles should be distinct and easy to recognize.
- Simple ground line, no complex terrain.

## Score
- A score counter at the top tracks how far the player has run (increments over time).
- Optional: show the highest score achieved (saved locally in the browser).

## Audio (Optional)
- Jump sound effect.
- Game over sound effect.

## Technical
- Pure HTML, CSS, and JavaScript (no heavy frameworks).
- Mobile-friendly layout.
- Keep all art assets as placeholders that can be replaced later.

**Build the full playable prototype with these specifications.**

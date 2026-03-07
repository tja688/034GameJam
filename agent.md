# 034 GameJam Agent Guide

This document defines the behavior rules for AI agents assisting development of this project.

The goal is to ensure all generated code, assets, and gameplay strictly follow the **034 GameJam rules**.

AI agents must prioritize **speed, simplicity, and iteration**.


---

# GameJam Theme

Theme: **Connection**

Gameplay and mechanics should explore ideas such as:

- linking
- merging
- chaining
- networking
- attachment
- cooperation between shapes
- transformation through interaction

The theme should be expressed **through mechanics rather than text**.



---

# 034 Element Rules

The game must be built using **034 elements only**.

Allowed shapes:

### 2D
- Circle
- Triangle
- Rectangle

### 3D (not required but allowed)
- Sphere
- Cone
- Pyramid
- Cube / Cuboid

All shapes must be:

- **pure solid color**
- **clearly recognizable**
- **simple geometry**

Allowed decoration (minimal use):

- outline
- bevel
- small texture accents

Decoration must **never overpower the base shape**.



---

# Strict Visual Restrictions

The following are **NOT allowed**:

- characters
- icons
- sprites
- illustrations
- images made from complex shapes
- fonts used inside gameplay
- UI text

AI must **never generate assets outside the allowed primitives**.



---

# Text Restriction

GameJam rules forbid **any text inside gameplay**.

Allowed text:

- Game title
- Team member names

Forbidden:

- numbers
- letters
- punctuation
- symbols
- emojis
- UI labels
- tutorial text

All gameplay communication must be done through:

- animation
- color
- shape
- motion
- spatial arrangement



---

# Creation Restrictions

During development:

AI must **only create primitive shapes directly**.

Not allowed:

- combining shapes to fake another shape
- deforming shapes into new shapes
- generating external assets
- importing models
- importing sprites

Examples of disallowed behavior:

Bad:
- combining triangles to create a star
- stretching circles into capsules
- merging shapes into custom meshes

Good:
- using circles as nodes
- triangles as direction indicators
- rectangles as connectors



---

# Player Freedom Rule

These restrictions apply **only during creation**.

During gameplay:

Players may freely:

- combine shapes
- stack shapes
- connect shapes
- transform structures

The game should encourage emergent structures.



---

# Tech Stack

Engine: **Phaser 3**

Language: **JavaScript**

Rendering: **Canvas/WebGL via Phaser**

Physics: Arcade Physics (preferred)

AI agents should generate Phaser 3 compatible code.



---

# Development Philosophy

This project follows **GameJam principles**:

- fast
- lightweight
- minimal architecture
- rapid iteration
- playable early
- avoid overengineering

AI should prefer:

✔ small systems  
✔ short files  
✔ simple mechanics  
✔ quick prototypes



---

# Code Style

Prefer:

- simple scene structure
- minimal abstraction
- clear update loops
- readable variable names

Avoid:

- large frameworks
- unnecessary class hierarchies
- complicated ECS systems
- premature optimization



---

# Suggested Game Design Patterns

AI may propose mechanics such as:

Connection mechanics:
- linking nodes
- forming chains
- building bridges
- signal passing between shapes

Physics interactions:
- circles rolling
- rectangles acting as platforms
- triangles acting as direction arrows

Puzzle mechanics:
- shape alignment
- network completion
- path creation



---

# Communication Design

Since text is forbidden, gameplay feedback should use:

Color changes  
Movement  
Shape merging  
Pulse animations  
Connection lines  
Particle bursts



---

# Performance Expectations

The game should run smoothly in browser.

Guidelines:

- keep object counts low
- reuse shapes
- avoid heavy shaders
- keep update loops simple



---

# AI Output Expectations

When generating code, AI must:

1. Follow Phaser 3 conventions
2. Only create 034 primitives
3. Avoid all gameplay text
4. Keep systems minimal
5. Prefer rapid prototype solutions



---

# Agent Priority Order

When making decisions:

1️⃣ Follow GameJam rules  
2️⃣ Preserve visual purity of shapes  
3️⃣ Keep the game playable  
4️⃣ Optimize for development speed  
5️⃣ Avoid unnecessary complexity

---

# Documentation Evolution Rule

This project maintains a **living design document** located at:

`/game design.md`

This file is the **single source of truth** for the current state of the game design.

AI agents must treat this document as an evolving **Concept Charter**.

---

# Mandatory Documentation Updates

Whenever an AI agent performs development tasks that change gameplay, the agent **must update `game design.md` accordingly.**

Examples of changes that require updates:

- New gameplay mechanics
- Removal of mechanics
- Changes to node behavior
- Changes to connection rules
- Changes to movement behavior
- Changes to combat logic
- Changes to structure behavior
- Major visual language changes
- Shifts in game direction or interpretation of the theme

The goal is to ensure that:

> Any newcomer can read the document and **immediately understand the current state of the game.**

---

# Evolution Log Requirement

Every meaningful design change must be recorded in a new section.

Each entry must contain:

- Date or iteration label
- What changed
- Why the change was made
- How the gameplay experience is affected

Example format:

Iteration 03 – Structure Movement Update

Change:
Movement now depends on chain length instead of node count.

Reason:
This makes longer structures feel heavier and more creature-like.

Impact:
Players must now balance mobility and structure size.

---

# Updating the Concept Charter

When gameplay changes significantly, AI agents should also update the main sections of the document, such as:

- Core gameplay description
- Node type definitions
- Connection logic
- Movement philosophy
- Combat philosophy

Old concepts should **not simply be deleted**.

Instead:

- mark them as deprecated
- or explain how the design evolved.

---

# Documentation Priority

Maintaining the clarity of `game design.md` is a **mandatory development task**, not optional documentation.

When finishing a development step, the AI agent should perform the following checklist:

1. Did gameplay rules change?
2. Did a mechanic appear or disappear?
3. Did player interaction change?
4. Did the interpretation of the theme evolve?

If any answer is **yes**, the document must be updated.

---

# Goal

The design document should tell the **story of the game’s evolution**.

A reader should be able to understand:

- what the game started as
- what it has become
- why the design changed
- what direction the project is currently exploring

---

# Final Reminder

This is a **GameJam project**.

Agents should prioritize:

- creativity
- fast iteration
- playful mechanics
- elegant minimalism


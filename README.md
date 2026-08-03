# Preacherman

The new Preacherman website begins here. This repository is the continuing main website project, with the opening character narrative implemented as its first scene.

## Files

```text
/
├── index.html
├── styles.css
├── script.js
├── README.md
└── assets/
    ├── LibreBaskerville-VariableFont_wght.ttf
    └── character-placeholder.png
```

## Run locally

From the project directory:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Current implementation

The current site contains a fixed, responsive primary navigation and one continuous, native-scroll opening scene. The header provides desktop dropdown navigation, a mobile accordion menu, and a scroll-linked brand transition. A sticky editorial canvas uses one normalized scroll progress value to reveal the supplied character image, introduce the three narrative judgments in sequence, draw a restrained structural line, and finish with the three closing statements.

The site uses only HTML, CSS, and native JavaScript. Libre Baskerville, the character image, and the Preacherman SVG logo are loaded locally from `assets/`.

## Not implemented yet

Later narrative scenes, character behavior, agents, model connections, memory, state, creation and publishing flows, asset packages, official characters, navigation, trust content, marketplace content, calls to action, and the footer are intentionally not included yet.

## Browser support and testing

The implementation targets current Safari, Chrome, Firefox, and Edge. It avoids WebGL, video, external libraries, scroll locking, scroll snapping, backdrop filters, and continuous shadow animation. The animated path uses a non-scaling SVG stroke, and scroll state is restored from the section position after refresh or resize. A static, fully readable layout is provided for `prefers-reduced-motion: reduce`.

# IGNITE MAX: 3D Online Multiplayer Battle Royale

An original, fast-paced 3D multiplayer battle royale game inspired by the mechanics of Free Fire MAX, engineered with Three.js, React, Tailwind CSS, Web Audio API, and an authoritative Node.js WebSocket game server.

---

## 🌟 Key Features

1. **Original Universe & Lore**:
   - Original cyberpunk & tactical island setting: **"Neo Caldera"** (500m × 500m).
   - 4 Original 3D Hero Operators: **VIPER**, **TITAN**, **MIRAGE**, and **NYX** with customized tactical suits, glowing holographic visors, and unique passive/active perks.
   - Customizable outfits & skins for each operator: Default, Electric Blaze, Obsidian Spec-Ops, and Golden Apex VIP.
   - 4 Fictional Sci-Fi Weapons: **AR-47 Igniter**, **Havoc SMG**, **Vanguard Sniper**, and **Apex Magnum** with procedural geometries, ballistic tracers, and synthesized sound effects.

2. **3D Graphics & Engine Architecture**:
   - Built on Three.js with directional sunlight, PCF soft shadows, distance fog, water ocean shaders, and a dynamic cylindrical safe zone energy barrier.
   - 3D Interactive Hero Pedestal in the Main Menu: rotate your operator 360° to inspect outfits and weapons.
   - Full POI landmarks across the island:
     - **Cyber Citadel**: Central multi-story command center.
     - **Cargo Shipyard & Docks**: Shipping containers and warehouses.
     - **Radar Outpost Alpha**: Military communications dish and sniper watchtowers.
     - **Stilt Bay Village**: Coastal huts and palm groves.
     - **Apex Observatory**: High-altitude mountain peak vantage point.

3. **Real Online Multiplayer & Custom Rooms**:
   - Real-time authoritative WebSocket game server operating at 20 Hz synchronization.
   - Room code matchmaking: Host generates a unique 5-character code (e.g. `MAX49`), share with friends to squad up across different devices or browser tabs.
   - Real-time player replication: movements, rotations, firing events, bullet impacts, damage calculations, and loot claims.
   - Live Lobby Browser (`/api/rooms`) to discover open matches.
   - Solo Survival / Practice mode with 9 tactical combat AI bots.

4. **Combat & Safe Zone**:
   - Ballistic raycast hit detection with headshot multipliers ($1.8\times$ to $2.2\times$).
   - Health (100) and Armor (100) shielding mechanics.
   - Dynamic crosshair bloom, hit markers with audio chimes, and an elimination kill feed.
   - Tactical Aim Down Sights (ADS) mode with mil-dot sniper scope reticle overlay.
   - Multi-phase shrinking safe zone ("The Plasma Storm") dealing damage ticks to players outside the perimeter.

5. **Cross-Platform Responsive Controls**:
   - **PC / Laptop**: `WASD` movement, Mouse look with Pointer Lock, `Left Click` fire, `Right Click` ADS toggle, `Shift` sprint, `Space` jump, `C` crouch, `R` reload, `1`–`4` weapons, `E` loot pickup.
   - **Android & iOS Touch HUD**: Left-hand virtual analog joystick, right-hand look swipe surface, dedicated Fire button, ADS toggle, Jump, Crouch, and Reload touch triggers.

6. **Web Audio API Synthesizer**:
   - 100% original synthesized audio without external MP3 files: punchy gunshots, reloads, footsteps, jump whooshes, hit markers, storm alert sirens, and dynamic electronic battle soundtrack.

---

## 📁 Project Structure

```
├── server.ts                  # Express + WebSocket authoritative game server & room manager
├── index.html                 # Mobile-optimized HTML viewport entry point with gaming fonts
├── src/
│   ├── types/
│   │   └── game.ts            # Data models, network packet definitions, hero & weapon types
│   ├── game/
│   │   ├── constants.ts       # Hero definitions, weapon stats, map dimensions, skins, inventory
│   │   ├── audio/
│   │   │   └── SoundSystem.ts # Web Audio API procedural sound synthesizer & dynamic soundtrack
│   │   └── engine/
│   │       ├── CharacterModels.ts # Procedural 3D character generator and animation rigging
│   │       ├── WeaponModels.ts    # Procedural 3D weapon models and ground loot drops
│   │       ├── MapGenerator.ts    # 3D island terrain, POIs, buildings, cover, and safe zone
│   │       └── GameEngine.ts      # Core 3D engine: camera, physics, combat, networking, bots
│   ├── components/
│   │   ├── MainMenu.tsx       # Main menu with 3D pedestal, play modes, inventory, friends, settings
│   │   ├── HeroPreview3D.tsx  # Interactive 3D hero showcase viewport with 360° rotation
│   │   ├── HUD.tsx            # In-game HUD: minimap radar, compass ribbon, reticle, health/armor
│   │   ├── MobileControls.tsx # Virtual analog joystick and touch action buttons
│   │   └── GameOverModal.tsx  # Victory Royale / Elimination screen with match statistics
│   ├── App.tsx                # Top-level React controller
│   ├── main.tsx               # React DOM entry
│   └── index.css              # Tailwind CSS imports and gaming typography utilities
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 🚀 Installation & Local Development

1. **Clone and Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Dev Server** (starts Express server with Vite middleware on port 3000):
   ```bash
   npm run dev
   ```

3. **Open Game in Browser**:
   Navigate to `http://localhost:3000`.

4. **Testing Multiplayer**:
   - Open two browser tabs or two devices on the same network.
   - In Tab 1: Click **"CREATE MULTIPLAYER ROOM"**.
   - Note the 5-character Room Code displayed on screen (e.g. `ABC12`).
   - In Tab 2: Click **"JOIN WITH ROOM CODE"**, enter the code, and join.
   - In Tab 1: Click **"START MATCH"** to deploy both players onto the island simultaneously!

---

## 🚢 Deployment

To build and run in production:

```bash
# Build production bundle
npm run build

# Start production server
NODE_ENV=production npm start
```

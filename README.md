# Urban Patrol — 2D Side-Scrolling Action Browser Game

A 2D side-scrolling urban beat-'em-up / run-and-gun browser game built with Vanilla HTML5 Canvas, ES Modules, and Web Audio API.
<img width="1680" height="1236" alt="image" src="https://github.com/user-attachments/assets/9599ed7b-81ba-4e77-bed8-92d12e40a2e0" />


## Features
- **3-Tier Rank Progression:**
  - **Lv.1 Metro Police** ➔ Collect **$1,000** to promote to **Lv.2 SWAT Tactical Unit** ➔ Collect **$10,000** to promote to **Lv.3 Military Spec-Ops Soldier** (each with multiple switchable character skins via `V`).
- **Dual Weapon & Ammo System + Close-Quarters Melee:**
  - **Primary Weapon (`Left-Click` / `Hold J`):** Rapid-fire primary sidearm/rifle with dedicated Primary Ammo & Reserve pool (`PRI`).
  - **Secondary Weapon (`Right-Click` / `Hold K`):** Heavy secondary firearm (Shotgun, Heavy Rifle, Taser/Baton) with dedicated Secondary Ammo & Reserve pool (`SEC`).
  - **Punch / Kick Melee (`F`, `E`, or `L`):** Zero-ammo close-quarters strike with forward lunge and knockback.
  - **Frag Grenade (`Middle-Click` / `G`):** High-damage explosive arc grenade.
- **4 Multi-Layer Parallax Urban Districts:**
  - *District 1: Downtown Crime Wave*
  - *District 2: Neon Night Syndicate*
  - *District 3: Quarantine Outbreak Zone*
  - *District 4: Ruined Warfront Sector*
- **Dynamic Combat Loot & Supply Chests:**
  - Defeated enemies drop `0–2` random pickups (Cash/Gold, Food HP items, or Cyberpunk Ammo Packs).
  - Every **15 enemy kills** air-drops a **Supply Chest** onto the street.

## Controls
| Action | Keys / Mouse |
| :--- | :--- |
| **Move** | `W` `A` `S` `D` or `Arrow Keys` |
| **Sprint** | `Shift` |
| **Jump** | `Space` |
| **Fire Primary Weapon (Rapid Fire)** | `Left-Click` or `Hold J` |
| **Fire Secondary Weapon** | `Right-Click` or `Hold K` |
| **Punch / Kick (Melee)** | `F` (or `E` / `L`) |
| **Throw Grenade** | `Middle-Click` or `G` |
| **Reload Weapons** | `R` |
| **Switch Character Skin** | `V` |
| **Pause Game** | `Esc` |

## Running Locally

Start a local static HTTP server from the project root:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

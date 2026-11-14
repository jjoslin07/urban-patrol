# 🚨 Metro Force : Urban Patrol — v1.0.0 (Public Beta)

Welcome to the first public beta release of **Metro Force : Urban Patrol**, a 2D pixel-art side-scrolling urban run-and-gun and beat-'em-up browser game built with Vanilla HTML5 Canvas, ES Modules, and procedural Web Audio API sound effects.
<img width="1680" height="1236" alt="image" src="https://github.com/user-attachments/assets/9599ed7b-81ba-4e77-bed8-92d12e40a2e0" />
🎮 **Play Live in Your Browser:** https://jjoslin07.github.io/urban-patrol/

> **⚠️ Beta Notice:** This release (`v1.0.0-beta`) is an active beta build. Weapon damage, enemy health scaling, ammo economy, and rank-up progression thresholds are actively being tuned based on gameplay feedback.

---

## ✨ Key Features in v1.0.0 (Beta)

### 🎖️ 3-Tier Officer Rank Progression
Collect cash & gold dropped by defeated enemies to earn automatic field promotions:
- **Lv.1 Metro Police** *(Starting Rank)* — Armed with a 25 DMG service pistol, secondary taser/baton, and 3 switchable officer skins (`[V]`).
- **Lv.2 SWAT Tactical Unit** *(Unlocks at **$1,000**)* — Upgraded armor (`165 HP`), rapid-fire tactical carbines, breaching shotguns, and 3 SWAT skins.
- **Lv.3 Military Spec-Ops Soldier** *(Unlocks at **$10,000**)* — Heavy armor (`220 HP`), high-capacity assault rifles, heavy secondary firearms, and veteran rank bonuses every **$10,000** thereafter.

### 🔫 Dual-Weapon Combat, Melee & Explosives
- **Primary Weapon (`Left-Click` / `Hold J`):** Rapid-fire primary weapon with a dedicated **Primary Ammo & Reserve Meter (`PRI`)**.
- **Secondary Weapon (`Right-Click` / `Hold K`):** Direct-fire secondary weapon (Tactical Shotgun, Heavy Rifle, Taser/Baton) with its own independent **Secondary Ammo & Reserve Meter (`SEC`)**.
- **Close-Quarters Punch / Kick (`F`, `E`, or `L`):** Zero-ammo melee strike with forward lunge, shockwave arc, and heavy knockback—ensuring you're never defenseless when out of ammo.
- **Frag Grenades (`Middle-Click` / `G`):** Arc-thrown explosive grenades with area-of-effect blast damage and recharge meter.

### 🌆 4 Multi-Layer Parallax Urban Districts
Battle through 4 long-form (`9,200px+`) side-scrolling city stages with distinct enemy factions and end-of-stage bosses:
1. **District 1 — Downtown Crime Wave:** Street Brawlers, Bandits, and Gangster Bosses.
2. **District 2 — Neon Night Syndicate:** Tommy-Gun Mobsters, Armed Thugs, and Syndicate Enforcers.
3. **District 3 — Quarantine Outbreak Zone:** Urban Zombies, Infected Police, and Bio-Mutants.
4. **District 4 — Ruined Warfront Sector:** High-density mixed factions and Toxic Mutant Bosses.

### 📦 Combat Loot & Kill-Streak Supply Chests
- **Enemy Loot Drops:** Enemies drop `0–2` items on defeat (Gold/Cash, Food HP restores, and Cyberpunk Ammo Packs), dynamically prioritizing ammo drops when your reserves run low.
- **15-Kill Supply Chests:** Every **15 enemy kills** air-drops a Supply Chest onto the street packed with bonus cash, health, and ammunition.

---

## 🕹️ Controls

| Action | Mouse / Keyboard |
| :--- | :--- |
| **Move** | `W` `A` `S` `D` or `Arrow Keys` |
| **Sprint** | `Shift` |
| **Jump / Dodge** | `Space` |
| **Fire Primary Weapon (Rapid Fire)** | `Left-Click` or `Hold J` |
| **Fire Secondary Weapon** | `Right-Click` or `Hold K` |
| **Punch / Kick (Melee)** | `F` (or `E` / `L`) |
| **Throw Frag Grenade** | `Middle-Click` or `G` |
| **Reload Weapons** | `R` |
| **Switch Character Skin** | `V` |
| **Pause Game** | `Esc` |

---

## 🧪 Known Beta Limitations & Upcoming Roadmap
- Balancing tweaks for enemy HP scaling and ammo pack drop rates across Districts 3 & 4.
- Additional boss attack patterns and stage hazards planned for upcoming releases.
- Local high-score & progression persistence (`localStorage`) coming in `v1.1.0`.

**Full Changelog**: https://github.com/jjoslin07/urban-patrol/commits/beta

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

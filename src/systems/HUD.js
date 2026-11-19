// HUD rendering for Urban Patrol — pure draw code, no game-state mutation.
// `state` is a plain snapshot passed in from main.js each frame.

export function drawHUD(ctx, canvas, state) {
  const {
    district,
    levelLen,
    player,
    totalKills,
    killsTowardsChest,
    killsPerChest,
    score,
    isPaused,
    districtBannerTimer,
  } = state;

  ctx.save();

  // 1. Top-Left Officer Status Panel (HP + Primary Ammo Meter + Secondary Ammo Meter)
  ctx.fillStyle = 'rgba(13, 17, 23, 0.86)';
  ctx.strokeStyle = '#30363d';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(12, 12, 285, 118, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#58a6ff';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(player.config.name, 24, 31);

  // HP Bar
  ctx.fillStyle = '#21262d';
  ctx.fillRect(24, 39, 185, 12);
  const hpRatio = player.config.infiniteHealth ? 1 : Math.max(0, player.hp / player.maxHp);
  ctx.fillStyle = player.config.infiniteHealth ? '#ffd166' : hpRatio > 0.35 ? '#06d6a0' : '#ef476f';
  ctx.fillRect(24, 39, Math.round(185 * hpRatio), 12);
  ctx.fillStyle = player.config.infiniteHealth ? '#0d1117' : '#f0f6fc';
  ctx.font = 'bold 10px system-ui, sans-serif';
  ctx.fillText(
    player.config.infiniteHealth ? 'HP ∞ / INFINITE (3X DMG)' : `HP ${player.hp}/${player.maxHp}`,
    30,
    49
  );

  // Grenade Energy Bar
  ctx.fillStyle = '#21262d';
  ctx.fillRect(24, 56, 185, 6);
  ctx.fillStyle = '#00b4d8';
  ctx.fillRect(24, 56, Math.round(185 * (player.specialEnergy / 100)), 6);

  // Primary Ammo Meter (L-Click / J)
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillText('PRI (L):', 24, 80);
  const maxPipsShown = Math.min(10, player.maxAmmo);
  const filledPips = player.config.infiniteAmmo
    ? maxPipsShown
    : Math.ceil((player.ammo / player.maxAmmo) * maxPipsShown);
  for (let i = 0; i < maxPipsShown; i++) {
    ctx.fillStyle = i < filledPips ? '#ffd166' : '#30363d';
    ctx.fillRect(74 + i * 8, 70, 5, 11);
  }
  ctx.fillStyle =
    !player.config.infiniteAmmo && player.ammo === 0 && player.reserveAmmo === 0
      ? '#ff6b6b'
      : '#e6edf3';
  ctx.fillText(
    player.config.infiniteAmmo
      ? '∞ INFINITE'
      : `${player.ammo}/${player.maxAmmo} (+${player.reserveAmmo})`,
    74 + maxPipsShown * 8 + 6,
    80
  );

  // Secondary Ammo Meter (R-Click / K)
  ctx.fillStyle = '#ff9f1c';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillText('SEC (R):', 24, 100);
  const maxSecPips = Math.min(10, player.maxSecAmmo);
  const filledSecPips = player.config.infiniteAmmo
    ? maxSecPips
    : Math.ceil((player.secAmmo / player.maxSecAmmo) * maxSecPips);
  for (let i = 0; i < maxSecPips; i++) {
    ctx.fillStyle = i < filledSecPips ? '#ff9f1c' : '#30363d';
    ctx.fillRect(74 + i * 8, 90, 5, 11);
  }
  ctx.fillStyle =
    !player.config.infiniteAmmo && player.secAmmo === 0 && player.secReserveAmmo === 0
      ? '#ff6b6b'
      : '#f59e0b';
  ctx.fillText(
    player.config.infiniteAmmo
      ? '∞ INFINITE'
      : `${player.secAmmo}/${player.maxSecAmmo} (+${player.secReserveAmmo})`,
    74 + maxSecPips * 8 + 6,
    100
  );

  // Melee / Reload Hint line
  ctx.fillStyle = '#8b949e';
  ctx.font = 'bold 10px system-ui, sans-serif';
  ctx.fillText('[F] PUNCH / KICK  •  [M-Click/G] GRENADE  •  [R] RELOAD', 24, 120);

  // 2. Top-Center GOLD & CHARACTER PROMOTION BAR (Police -> SWAT -> Soldier)
  const promoBoxW = 360;
  const promoBoxX = Math.round((canvas.width - promoBoxW) / 2);
  ctx.fillStyle = 'rgba(13, 17, 23, 0.88)';
  ctx.strokeStyle = '#d97706';
  ctx.beginPath();
  ctx.roundRect(promoBoxX, 12, promoBoxW, 74, 8);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 12px system-ui, sans-serif';
  const upgradeTitle =
    player.tierKey === 'police'
      ? 'GOLD UPGRADE: POLICE ➔ SWAT UNIT'
      : player.tierKey === 'swat'
      ? 'GOLD UPGRADE: SWAT ➔ ELITE SOLDIER'
      : player.tierKey === 'soldier'
      ? 'GOLD UPGRADE: SOLDIER ➔ CYBER DIVISION'
      : player.tierKey === 'cyber'
      ? 'GOLD UPGRADE: CYBER ➔ OFFICER JOE'
      : player.tierKey === 'joe'
      ? 'GOLD UPGRADE: OFFICER JOE ➔ SPECIAL'
      : `SPECIAL ROSTER (LEGEND RANK ${player.veteranRank})`;
  ctx.fillText(upgradeTitle, canvas.width / 2, 31);

  // Gold Progress Bar Track
  const barX = promoBoxX + 20;
  const barY = 40;
  const barW = promoBoxW - 40;
  const barH = 16;
  ctx.fillStyle = '#21262d';
  ctx.fillRect(barX, barY, barW, barH);

  const goldRatio = Math.min(1, player.upgradeGold / player.upgradeTarget);
  const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  grad.addColorStop(0, '#f59e0b');
  grad.addColorStop(1, '#fde047');
  ctx.fillStyle = grad;
  ctx.fillRect(barX, barY, Math.round(barW * goldRatio), barH);

  ctx.strokeStyle = '#fbbf24';
  ctx.strokeRect(barX, barY, barW, barH);

  ctx.fillStyle = '#0d1117';
  ctx.font = '900 11px system-ui, sans-serif';
  ctx.fillText(
    `$${player.upgradeGold} / $${player.upgradeTarget}  (${Math.round(goldRatio * 100)}%)`,
    canvas.width / 2 + 1,
    barY + 12
  );
  ctx.fillStyle = '#ffffff';
  ctx.fillText(
    `$${player.upgradeGold} / $${player.upgradeTarget}  (${Math.round(goldRatio * 100)}%)`,
    canvas.width / 2,
    barY + 12
  );

  ctx.fillStyle = '#c9d1d9';
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText(
    `Chest Drop: ${killsTowardsChest}/${killsPerChest} Kills   •   Total Gold: $${player.totalGold}`,
    canvas.width / 2,
    74
  );

  // 3. Top-Right District & Street Progress Panel
  ctx.fillStyle = 'rgba(13, 17, 23, 0.86)';
  ctx.strokeStyle = '#30363d';
  ctx.beginPath();
  ctx.roundRect(canvas.width - 262, 12, 250, 74, 8);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'right';
  ctx.fillStyle = '#f0f6fc';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText(district.name, canvas.width - 24, 31);

  // Street Distance Progress Bar
  const distRatio = Math.min(1, player.x / (levelLen - 100));
  ctx.fillStyle = '#21262d';
  ctx.fillRect(canvas.width - 244, 40, 220, 9);
  ctx.fillStyle = '#58a6ff';
  ctx.fillRect(canvas.width - 244, 40, Math.round(220 * distRatio), 9);

  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText(
    `PROGRESS: ${Math.round(distRatio * 100)}%   •   KILLS: ${totalKills}`,
    canvas.width - 24,
    68
  );

  // Promotion Celebration Banner
  if (player.promotionBannerTimer > 0) {
    const alpha = Math.min(1, player.promotionBannerTimer);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(13, 17, 23, 0.9)';
    ctx.fillRect(0, 118, canvas.width, 64);
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 118);
    ctx.lineTo(canvas.width, 118);
    ctx.moveTo(0, 182);
    ctx.lineTo(canvas.width, 182);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd166';
    ctx.font = '900 22px system-ui, sans-serif';
    ctx.fillText(`★ ${player.promotionBannerText} ★`, canvas.width / 2, 150);
    ctx.fillStyle = '#06d6a0';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText(
      `Now Playing: ${player.config.name} — ${player.config.role}`,
      canvas.width / 2,
      171
    );
    ctx.globalAlpha = 1;
  }

  // District Intro Banner
  if (districtBannerTimer > 0 && !isPaused) {
    const alpha = Math.min(1, districtBannerTimer);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(13, 17, 23, 0.86)';
    ctx.fillRect(0, canvas.height / 2 - 48, canvas.width, 88);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#58a6ff';
    ctx.font = '900 22px system-ui, sans-serif';
    ctx.fillText(district.name.toUpperCase(), canvas.width / 2, canvas.height / 2 - 10);
    ctx.fillStyle = '#c9d1d9';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText(district.subtitle, canvas.width / 2, canvas.height / 2 + 18);
    ctx.globalAlpha = 1;
  }

  // PAUSED Overlay
  if (isPaused) {
    ctx.fillStyle = 'rgba(9, 13, 20, 0.76)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(22, 27, 34, 0.95)';
    ctx.strokeStyle = '#58a6ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(canvas.width / 2 - 190, canvas.height / 2 - 70, 380, 140, 12);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#58a6ff';
    ctx.font = '900 30px system-ui, sans-serif';
    ctx.fillText('GAME PAUSED', canvas.width / 2, canvas.height / 2 - 14);
    ctx.fillStyle = '#f0f6fc';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText('Press [ESC] to Resume Patrol', canvas.width / 2, canvas.height / 2 + 22);
    ctx.fillStyle = '#8b949e';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(
      `Chest Counter: ${killsTowardsChest}/${killsPerChest} Kills   •   Score: ${score}`,
      canvas.width / 2,
      canvas.height / 2 + 48
    );
  }

  // Downed Overlay
  if (player.state === 'dead') {
    ctx.fillStyle = 'rgba(13, 17, 23, 0.78)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ef476f';
    ctx.font = '900 34px system-ui, sans-serif';
    ctx.fillText('UNIT DOWN', canvas.width / 2, canvas.height / 2 - 15);
    ctx.fillStyle = '#f0f6fc';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText(
      'Press [ENTER] or [SPACE] to Respawn Here',
      canvas.width / 2,
      canvas.height / 2 + 24
    );
  }

  ctx.restore();
}


/* sim-culinary.js — bake a loaf: add ingredients, whisk, bake */
(function () {
  'use strict';

  SimCore.modules.culinary = {
    name: 'Baking Lab',
    desc: 'Add the flour, sugar and eggs in order, whisk the batter five times, then heat the oven to 350°F and bake.',
    startMode: 'Add the first ingredient',
    intro: 'Click ingredients on the counter to add them to the bowl in the right order. Whisk with repeated clicks, then raise the oven temperature and press BAKE.',
    tasks: [
      { title: 'Add the flour', desc: 'Click the flour sack.' },
      { title: 'Add the sugar', desc: 'Click the sugar jar.' },
      { title: 'Add the eggs', desc: 'Click the egg crate.' },
      { title: 'Whisk the batter', desc: 'Click the bowl five times.' },
      { title: 'Heat to 350°F & bake', desc: 'Click oven ▲ until it reads 350°, then press BAKE.' },
    ],
    hints: {
      any: [
        'Ingredients must go into the bowl in the listed order.',
        'Keep clicking the whisk/bowl to build up the batter.',
        'Click the oven temperature arrow until the display shows 350°, then hit BAKE.',
      ],
    },

    build(core) {
      const world = core.world;
      const ING = [
        { key: 'flour', color: 0xf5f0e1, label: 'FLOUR' },
        { key: 'sugar', color: 0xe7e5e4, label: 'SUGAR' },
        { key: 'eggs', color: 0xfcd34d, label: 'EGGS' },
      ];
      const padding = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.7 });
      const grate = new THREE.Mesh(
        new THREE.BoxGeometry(5.2, 0.1, 2.6),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 })
      );
      grate.position.set(0, -1.0, 0);
      world.add(grate);

      /* bowl */
      const bowl = new THREE.Mesh(
        new THREE.SphereGeometry(0.85, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.6),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.2 })
      );
      bowl.position.set(0, -0.4, 0);
      bowl.userData.tag = 'bowl';
      core.clickables.push(bowl);
      world.add(bowl);

      /* mixing colors inside bowl (added ingredients grow) */
      const mixMat = new THREE.MeshStandardMaterial({ color: 0xdcb17a, roughness: 0.9 });
      const mix = new THREE.Mesh(new THREE.SphereGeometry(0.62, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.48), mixMat);
      mix.position.y = -0.32;
      mix.visible = false;
      mix.userData.tag = 'bowl';
      core.clickables.push(mix);
      world.add(mix);

      /* whisk */
      const whisk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.26, 0.26, 0.7, 10, 1),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.3 })
      );
      whisk.rotation.x = Math.PI / 4;
      whisk.position.set(0.25, 0.35, 0.15);
      whisk.userData.tag = 'whisk';
      core.clickables.push(whisk);
      world.add(whisk);

      /* ingredients */
      ING.forEach((it, i) => {
        const g = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.6), new THREE.MeshStandardMaterial({ color: it.color, roughness: 0.6 }));
        g.add(body);
        const lbl = core.makeLabel(it.label, '#1e293b');
        lbl.position.y = 0.62;
        g.add(lbl);
        const x = (i - 1) * 1.7;
        g.position.set(x, -0.3, 2.1);
        g.userData.tag = 'ing:' + it.key;
        g.userData.ing = it.key;
        core.clickables.push(g);
        world.add(g);
      });

      /* oven panel */
      const ovenBox = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 2.2, 0.8),
        new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.6 })
      );
      ovenBox.position.set(2.3, 0.1, 1.1);
      world.add(ovenBox);
      const ovenDoor = new THREE.Mesh(
        new THREE.PlaneGeometry(0.95, 1.6),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.2, metalness: 0.8 })
      );
      ovenDoor.position.set(2.3, 0.05, 1.51);
      ovenDoor.rotation.y = Math.PI / 2;
      world.add(ovenDoor);

      const disp = core.makeLabel('300°F', '#fca5a5');
      disp.position.set(2.3, 1.45, 1.53);
      disp.scale.set(1.6, 0.34, 1);
      core._disp = disp;
      world.add(disp);

      const upBtn = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.5, 0.2),
        new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 })
      );
      upBtn.position.set(2.0, 1.05, 1.53);
      upBtn.userData.tag = 'ovenup';
      core.clickables.push(upBtn);
      const upLbl = core.makeLabel('▲', '#ffffff');
      upLbl.position.set(2.0, 1.05, 1.53);
      upLbl.scale.set(0.9, 0.24, 1);
      upLbl.userData.tag = 'ovenup';
      core.clickables.push(upLbl);
      world.add(upBtn, upLbl);

      const bakeBtn = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.5, 0.2),
        new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.5 })
      );
      bakeBtn.position.set(2.55, 1.05, 1.53);
      bakeBtn.userData.tag = 'bake';
      core.clickables.push(bakeBtn);
      const bakeLbl = core.makeLabel('BAKE', '#ffffff');
      bakeLbl.position.set(2.55, 1.05, 1.53);
      bakeLbl.scale.set(1.4, 0.26, 1);
      bakeLbl.userData.tag = 'bake';
      core.clickables.push(bakeLbl);
      world.add(bakeBtn, bakeLbl);

      core._mix = mix;
      core._mixMat = mixMat;
      core._whisk = whisk;
      core._ovenTemp = 300;
      core._step = 0; /* 0=flour 1=sugar 2=eggs 3=whisk */
    },

    onClick(hit, core) {
      const tag = hit.userData.tag;
      const s = core.state;
      const ORDER = ['flour', 'sugar', 'eggs'];

      if (tag && tag.startsWith('ing:')) {
        const key = tag.slice(4);
        if (core._step >= 3) { core.flash('The batter is already mixed — whisk and bake next.'); return; }
        if (ORDER[core._step] === key) {
          s.moves += 0.5;
          if (core._step === 0) core._mix.visible = true;
          core._collect(key);
          core.completeTask();
          core.flash(`${key} added!`);
          core._step += 1;
          core.setMode(core._step <= 2 ? `Add the ${ORDER[core._step]}` : 'Whisk the batter (5 clicks)');
        } else {
          s.moves += 0.5;
          core.flash(`That's not next — the recipe needs ${ORDER[core._step]} now.`);
        }
        core.updateHud();
        return;
      }

      if (tag === 'whisk' || tag === 'bowl') {
        if (core._step !== 3) { core.flash('Add all the ingredients before whisking.'); return; }
        core._whiskCount = (core._whiskCount || 0) + 1;
        s.moves += 0.5;
        core.updateHud();
        core._wind = (core._wind || 0) + 1;
        if (core._whiskCount === 5) { core.completeTask(); core._step = 4; core.setMode('Set oven to 350°F'); core.flash('Batter whisked silky.smooth'); }
        else core.flash(`Whisking… ${core._whiskCount}/5`);
        return;
      }

      if (tag === 'ovenup') {
        if (core._step !== 4) { core.flash('Mix the batter before preheating.'); return; }
        s.moves += 0.5;
        core._ovenTemp = Math.min(450, core._ovenTemp + 10);
        core.updateDisp(core._ovenTemp);
        if (core._ovenTemp === 350) core.flash('Oven at 350°F — hit BAKE!');
        else core.flash(`Oven: ${core._ovenTemp}°F`);
        return;
      }

      if (tag === 'bake') {
        if (core._step !== 4) { core.flash('Finish the batter first.'); return; }
        if (core._ovenTemp !== 350) { core.flash(`Oven is ${core._ovenTemp}°F — set it to 350°F first.`); return; }
        s.moves += 0.5;
        core.completeTask();
        core.setMode('Baked!');
        core.flash('Bread baked to golden perfection. 🥖');
        return;
      }
    },

    _collect(key) {
      /* tint the batter */
      const tints = { flour: 0xe8d9a0, sugar: 0xf1ece3, eggs: 0xf0d06a };
      this._mixMat.color.setHex(tints[key]);
    },

    /* custom updateDisp hook: re-renders the oven display sprite */
    updateDisp(temp) {
      const lbl = this._disp;
      lbl.material.map.dispose();
      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 96;
      const ctx = canvas.getContext('2d');
      ctx.font = 'bold 46px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fca5a5';
      ctx.fillText(`${temp}°F`, 256, 48);
      lbl.material.map = new THREE.CanvasTexture(canvas);
      lbl.material.map.minFilter = THREE.LinearFilter;
      lbl.material.needsUpdate = true;
    },

    reset(core) {
      core._step = 0; core._ovenTemp = 300; core._whiskCount = 0; core._wind = 0;
      core._mix.visible = false;
      core.updateDisp(300);
    },

    animate(core, dt) {
      if (core._wind) core._whisk.rotation.y += dt * (6 + core._wind * 2);
    },
  };
})();
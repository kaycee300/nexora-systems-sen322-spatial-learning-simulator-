/* sim-carpentry.js — measure & cut timber: time the blade at the line, sand, finish */
(function () {
  'use strict';

  SimCore.modules.carpentry = {
    name: 'Carpentry Workshop',
    desc: 'Cut a board on the line with the power saw, sand the edge smooth, then apply the stain.',
    startMode: 'Watch the saw blade',
    intro: 'Click the START CUT button to run the blade across the board, then click to stop the blade exactly on the yellow cut line. Then sand and finish the edge.',
    tasks: [
      { title: 'Make the first cut', desc: 'Stop the blade on the first (outer) cut line.' },
      { title: 'Make the second cut', desc: 'The saw resets — stop the blade on the inner cut line.' },
      { title: 'Sand the edge', desc: 'Click the rough edge five times to smooth it.' },
      { title: 'Apply the stain', desc: 'Click the stain tin, then click the board to finish it.' },
    ],
    hints: {
      any: [
        'Stop the blade as close to the yellow line as possible — timing matters.',
        'Only a cut within 0.15 units of the line counts. Stop early or late and it resets.',
        'After both cuts, keep clicking the exposed edge to sand it down.',
      ],
    },

    build(core) {
      const world = core.world;

      const benchTop = new THREE.Mesh(
        new THREE.BoxGeometry(5.4, 0.35, 2.2),
        new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 })
      );
      benchTop.position.set(0, -0.6, 0);
      world.add(benchTop);

      const benchLegs = [
        [-2.3, -1.6, -0.9], [2.3, -1.6, -0.9], [-2.3, -1.6, 0.9], [2.3, -1.6, 0.9],
      ];
      benchLegs.forEach(([x, y, z]) => {
        const leg = new THREE.Mesh(
          new THREE.BoxGeometry(0.25, 1.4, 0.25),
          new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.7 })
        );
        leg.position.set(x, y, z);
        world.add(leg);
      });

      /* the workpiece */
      const WOOD = 0xd97706;
      const woodMat = new THREE.MeshStandardMaterial({ color: WOOD, roughness: 0.7 });
      const board = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.28, 1.1), woodMat);
      board.position.set(0, -0.15, 0);
      world.add(board);

      /* cut lines */
      const lineMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
      const line1 = makeThinLine(-1.2);
      const line2 = makeThinLine(1.25);
      function makeThinLine(x) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.33, 1.16), lineMat);
        m.position.set(x, -0.15, 0);
        world.add(m);
        return m;
      }

      /* the saw */
      const sawGroup = new THREE.Group();
      const sawBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.2, 0.35),
        new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.7, roughness: 0.3 })
      );
      sawBody.position.y = 0.28;
      sawGroup.add(sawBody);
      const blade = new THREE.Mesh(
        new THREE.CylinderGeometry(0.34, 0.34, 0.08, 24),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.2 })
      );
      blade.rotation.x = Math.PI / 2;
      blade.position.y = 0.28;
      sawGroup.add(blade);
      sawGroup.position.set(-1.6, -0.02, 0);
      sawGroup.userData.tag = 'saw';
      core.clickables.push(sawGroup);
      world.add(sawGroup);
      sawGroup.visible = false;

      const startBtn = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.55, 0.35),
        new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 })
      );
      startBtn.position.set(0, -0.75, 1.9);
      startBtn.userData.tag = 'startcut';
      core.clickables.push(startBtn);
      const startLbl = core.makeLabel('START CUT', '#ffffff');
      startLbl.position.set(0, -0.2, 2.0);
      startLbl.scale.set(2.2, 0.42, 1);
      startLbl.userData.tag = 'startcut';
      core.clickables.push(startLbl);
      world.add(startBtn, startLbl);

      /* sanding + finishing */
      const edge = new THREE.Mesh(
        new THREE.BoxGeometry(4.6, 0.28, 0.1),
        new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.95 })
      );
      edge.position.set(0, -0.15, 0.61);
      edge.userData.tag = 'edge';
      core.clickables.push(edge);

      const stainTin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 0.55, 20),
        new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.4 })
      );
      stainTin.position.set(2.5, -0.4, 1.7);
      stainTin.userData.tag = 'stain';
      core.clickables.push(stainTin);
      const stainLbl = core.makeLabel('STAIN', '#fdba74');
      stainLbl.position.set(2.5, 0.35, 1.7);
      stainLbl.scale.set(1.6, 0.32, 1);
      stainLbl.userData.tag = 'stain';
      core.clickables.push(stainLbl);
      world.add(stainTin, stainLbl);

      core._board = board;
      core._woodMat = woodMat;
      core._saw = sawGroup;
      core._blade = blade;
      core._lines = [line1, line2];
      core._edge = edge;
      core._stainTin = stainTin;
      core._sawState = { running: false, cut: -1.6, dir: 1 };
    },

    onClick(hit, core) {
      const tag = hit.userData.tag;
      const saw = core._sawState;

      if (tag === 'startcut') {
        if (core.state.completed >= 2) { core.flash('All cuts are done. Sand and finish the board.'); return; }
        if (saw.running) { core.flash('The blade is already moving!'); return; }
        saw.running = true;
        saw.cut = -1.6; saw.dir = 1;
        core._saw.visible = true;
        core.setMode(`Stop the blade at the ${core.state.completed === 0 ? 'outer' : 'inner'} line!`);
        core.flash('Blade sweeping — click the saw to stop it on the yellow line.');
        return;
      }

      if (tag === 'saw') {
        if (!saw.running) return;
        saw.running = false;
        core.state.moves += 1;
        core.updateHud();
        core._saw.visible = false;
        const target = core.state.completed === 0 ? -1.2 : 1.25;
        const dist = Math.abs(saw.cut - target);
        if (dist <= 0.15) {
          core.completeTask();
          core.flash('Clean cut on the line!');
        } else {
          core.flash(`Cut was ${dist.toFixed(2)} away — reset and try again.`);
        }
        if (core.state.completed === 2) core.setMode('Sand the edge');
        else core.setMode('Prepare for the next cut');
        return;
      }

      if (tag === 'edge') {
        if (core.state.completed < 2) { core.flash('Cut the board first, then sand the edge.'); return; }
        core._sandCount = (core._sandCount || 0) + 1;
        core.state.moves += 0.5;
        core.updateHud();
        if (core._sandCount === 5) { core.completeTask(); core.flash('Edge is silky smooth.'); }
        else core.flash(`Sanding… ${core._sandCount}/5 (keep clicking)`);
        return;
      }

      if (tag === 'stain') {
        if (core.state.completed < 3) { core.flash('Sand the edge before staining.'); return; }
        core._stainTin.material.color.set(0x9a3412);
        core.state.moves += 0.5;
        core.completeTask();
        core.setMode('Done!');
        core.flash('Board stained. Lovely finish. 🎨');
        return;
      }
    },

    reset(core) {
      core._sawState = { running: false, cut: -1.6, dir: 1 };
      core._saw.visible = false;
      core._sandCount = 0;
    },

    animate(core, dt) {
      const saw = core._sawState;
      if (saw.running) {
        const speed = 2.2;
        const lo = -2.0, hi = 2.2;
        saw.cut += saw.dir * speed * dt;
        if (saw.cut >= hi) { saw.cut = hi; saw.dir = -1; }
        if (saw.cut <= lo) { saw.cut = lo; saw.dir = 1; }
        core._saw.position.x = saw.cut;
        core._blade.rotation.z += dt * 14;
      }
    },
  };
})();
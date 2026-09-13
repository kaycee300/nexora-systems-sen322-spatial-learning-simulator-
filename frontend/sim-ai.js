/* sim-ai.js — train a model: pick features, tune learning rate, train to ≥85% accuracy */
(function () {
  'use strict';

  SimCore.modules.ai = {
    name: 'AI Training Lab',
    desc: 'Pick the two right features, set a good learning rate, train the model and reach 85%+ accuracy.',
    startMode: 'Pick two features',
    intro: 'Click two feature cards on the left. Set the learning rate with the +/- lever, then press TRAIN and watch the accuracy ring.',
    tasks: [
      { title: 'Select the best features', desc: 'Click two of the three feature cards.' },
      { title: 'Tune the learning rate', desc: 'Set the learning rate to 0.001 (three presses of −).' },
      { title: 'Train the model', desc: 'Press TRAIN and wait for the ring to fill.' },
      { title: 'Reach 85% accuracy', desc: 'Retrain until accuracy is 85% or better.' },
    ],
    hints: {
      any: [
        'Two of the three features strongly predict the target — the third is noise.',
        'A fast learning rate overshoots. Set it to 0.001 for stability.',
        'Accurate also depends on the features you chose. Retrain to check.',
      ],
    },

    build(core) {
      const world = core.world;
      const FEAT = [
        { key: 'a', label: 'FEATURE A', color: 0x0ea5e9, y: 1.4 },
        { key: 'b', label: 'FEATURE B', color: 0x818cf8, y: 0.0 },
        { key: 'c', label: 'FEATURE C', color: 0x64748b, y: -1.4 },
      ];
      const cards = {};
      FEAT.forEach((f) => {
        const g = new THREE.Group();
        const card = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.7), new THREE.MeshStandardMaterial({ color: f.color, roughness: 0.5 }));
        g.add(card);
        const lbl = core.makeLabel(f.label, '#ffffff');
        lbl.scale.set(2.6, 0.5, 1);
        g.add(lbl);
        g.position.set(-3.3, f.y, 0);
        g.userData.tag = 'feat:' + f.key;
        g.userData.feat = f.key;
        core.clickables.push(g);
        world.add(g);
        cards[f.key] = { group: g, mat: card.material };
      });
      core._cards = cards;

      /* neural net viz */
      const nodes = [];
      const pos = [[-1.2, 2], [-2, 0.4], [-1.2, -1.5], [0, 1.4], [0, -1.4], [1.4, 0.6], [2, 1.6], [2, -0.4]];
      const nodeMat = new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x22d3ee, emissiveIntensity: 0.35 });
      pos.forEach(([x, y], i) => {
        const n = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 14), nodeMat.clone());
        n.position.set(x * 0.8, y * 0.62, 0.2);
        world.add(n);
        nodes.push(n);
      });
      core._nodes = nodes;

      const connMat = new THREE.LineBasicMaterial({ color: 0x475569 });
      for (let i = 0; i < 6; i++) {
        for (let j = 6; j < nodes.length; j++) {
          const geo = new THREE.BufferGeometry().setFromPoints([nodes[i].position, nodes[j].position]);
          world.add(new THREE.Line(geo, connMat));
        }
      }

      /* accuracy ring */
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.9, 0.09, 14, 40, Math.PI * 1.5),
        new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.6 })
      );
      ring.position.set(0, 0, -1.2);
      ring.rotation.z = -0.25 * Math.PI;
      core._ring = ring;
      world.add(ring);

      const accLbl = core.makeLabel('0%', '#4ade80');
      accLbl.position.set(0, 0, -1.2);
      accLbl.scale.set(2.2, 0.45, 1);
      core._accLbl = accLbl;
      world.add(accLbl);

      /* learning rate lever */
      const leverBase = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.15, 20), new THREE.MeshStandardMaterial({ color: 0x334155 }));
      leverBase.position.set(3.2, 0, 0);
      world.add(leverBase);
      const minus = mkButton('−', 0x64748b, 'lrminus', 2.75, 0.75, 0);
      const plus = mkButton('+', 0x14b8a6, 'lrplus', 3.65, 0.75, 0);
      const lrLbl = core.makeLabel('LR 0.01', '#a5b4fc');
      lrLbl.position.set(3.2, 1.0, 0);
      lrLbl.scale.set(2.4, 0.48, 1);
      core._lrLbl = lrLbl;
      world.add(lrLbl, minus, plus);

      /* train button */
      const train = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.5, 24), new THREE.MeshStandardMaterial({ color: 0x16a34a, emissive: 0x16a34a, emissiveIntensity: 0.25 }));
      train.position.set(3.2, -1.3, 0);
      train.userData.tag = 'train';
      core.clickables.push(train);
      const trainLbl = core.makeLabel('TRAIN', '#ffffff');
      trainLbl.position.set(3.2, -1.3, 0);
      trainLbl.scale.set(2.0, 0.4, 1);
      trainLbl.userData.tag = 'train';
      core.clickables.push(trainLbl);
      world.add(train, trainLbl);

      function mkButton(sym, color, tag, x, y, z) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.2), new THREE.MeshStandardMaterial({ color, roughness: 0.5 }));
        b.position.set(x, y, z);
        b.userData.tag = tag;
        core.clickables.push(b);
        const lbl = core.makeLabel(sym, '#ffffff');
        lbl.position.set(x, y, z + 0.05);
        lbl.scale.set(0.9, 0.24, 1);
        lbl.userData.tag = tag;
        core.clickables.push(lbl);
        world.add(b, lbl);
        return b;
      }

      core._selectedFeats = new Set();
      core._lr = 0.01;
      core._accuracy = 0;
      core._training = false;
      core._updates = [0.01, 0.001, 0.0001];
    },

    onClick(hit, core) {
      const tag = hit.userData.tag;
      const s = core.state;

      if (tag && tag.startsWith('feat:')) {
        const key = tag.slice(5);
        if (core._training) { core.flash('Model is training — wait for it.'); return; }
        s.moves += 0.5;
        if (core._selectedFeats.has(key)) {
          core._selectedFeats.delete(key);
          core._cards[key].mat.color.set(lookupCard(key));
        } else {
          if (core._selectedFeats.size >= 2) { core.flash('Two features only — deselect one first.'); return; }
          core._selectedFeats.add(key);
          core._cards[key].mat.color.set(0x0f172a);
        }
        core._cards[key].mat.emissive = new THREE.Color(core._selectedFeats.has(key) ? 0x22d3ee : 0x000000);
        core._cards[key].mat.emissiveIntensity = core._selectedFeats.has(key) ? 0.6 : 0;
        if (core._selectedFeats.size === 2) {
          if (s.completed < 1) { core.completeTask(); core.setMode('Tune the learning rate'); core.flash('Features locked in!'); }
          else core.flash('Features updated.');
        } else if (s.completed === 0) {
          core.setMode('Pick one more feature');
        }
        core.updateHud();
        return;
      }

      if (tag === 'lrminus' || tag === 'lrplus') {
        if (core._training) { core.flash('Wait for training to finish.'); return; }
        s.moves += 0.5;
        const idx = core._updates.indexOf(core._lr);
        const nidx = tag === 'lrminus' ? Math.max(0, idx - 1) : Math.min(core._updates.length - 1, idx + 1);
        core._lr = core._updates[nidx];
        if (s.completed === 1 && core._lr === 0.001) { core.completeTask(); core.setMode('Press TRAIN'); core.flash('Learning rate looks stable.'); }
        else core.flash(`Learning rate: ${core._lr}`);
        core._lrLbl.material.map.dispose();
        core._lrLbl.material.map = core.makeLabel2(`LR ${core._lr}`, '#a5b4fc');
        core._lrLbl.material.needsUpdate = true;
        core.updateHud();
        return;
      }

      if (tag === 'train') {
        if (core._selectedFeats.size !== 2) { core.flash('Pick two features first.'); return; }
        if (s.completed < 2) { core.flash('Set the learning rate to 0.001 before training.'); return; }
        if (core._training) return;
        core._training = true;
        core.setMode('Training…');
        core.flash('Training started…');
        const good = core._selectedFeats.has('a') && core._selectedFeats.has('b');
        const lrGood = core._lr === 0.001;
        let base = good ? 92 : lrGood ? 71 : 62;
        base += (Math.random() - 0.5) * 4;
        core._trainAcc = Math.max(0, Math.min(100, Math.round(base)));
        return;
      }
    },

    makeLabel2(text, color) {
      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 96;
      const ctx = canvas.getContext('2d');
      ctx.font = 'bold 46px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.fillText(text, 256, 48);
      const tex = new THREE.CanvasTexture(canvas);
      tex.minFilter = THREE.LinearFilter;
      return tex;
    },

    animate(core, dt) {
      const nodes = core._nodes;
      const t = performance.now() / 1000;
      nodes.forEach((n, i) => {
        n.position.y += Math.sin(t * 1.6 + i) * 0.001;
        if (core._training) n.material.emissiveIntensity = 0.35 + Math.random() * 1.2;
        else n.material.emissiveIntensity = 0.35;
      });

      if (core._training) {
        core._trainT = (core._trainT || 0) + dt * 3;
        const frac = Math.min(1, core._trainT);
        const acc = Math.round(core._trainAcc * frac);
        core._ring.rotation.z = -0.25 * Math.PI + frac * Math.PI * 1.5;
        if (core._accLbl) {
          updateLabel(core._accLbl, `${acc}%`, '#4ade80');
        }
        if (frac >= 1) {
          core._training = false;
          core._trainT = 0;
          core._accuracy = core._trainAcc;
          core.state.moves += 1;
          core.updateHud();
          if (core._accuracy >= 85) {
            if (core.state.completed < 3) core.completeTask();
            if (core.state.completed < 4) { core.completeTask(); core.setMode('Done!'); }
            core.flash(`Accuracy ${core._accuracy}% — model is solid! 🧠`);
          } else {
            if (core.state.completed < 3) core.completeTask();
            core.setMode('Retrain');
            core.flash(`Only ${core._accuracy}% — tweak features or learning rate and retrain.`);
          }
        }
      }
    },

    reset(core) {
      core._selectedFeats = new Set();
      Object.values(core._cards).forEach((c) => { c.mat.emissiveIntensity = 0; });
      core._lr = 0.01;
      core._accuracy = 0;
      core._training = false;
      core._trainT = 0;
      core._lrLbl.material.map = core.makeLabel2('LR 0.01', '#a5b4fc');
      updateLabel(core._accLbl, '0%', '#4ade80');
      core._ring.rotation.z = -0.25 * Math.PI;
    },
  };

  function updateLabel(sprite, text, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 96;
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 46px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(text, 256, 48);
    sprite.material.map.dispose();
    sprite.material.map = new THREE.CanvasTexture(canvas);
    sprite.material.map.minFilter = THREE.LinearFilter;
    sprite.material.needsUpdate = true;
  }

  function lookupCard(key) {
    return { a: 0x0ea5e9, b: 0x818cf8, c: 0x64748b }[key];
  }
})();
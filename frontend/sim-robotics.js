/* sim-robotics.js — assemble a robot: mount parts, then power up */
(function () {
  'use strict';

  const PARTS = [
    { name: 'controller', color: 0x14b8a6, label: 'CONTROLLER' },
    { name: 'sensor', color: 0x06b6d4, label: 'SENSOR' },
    { name: 'servo', color: 0xf59e0b, label: 'SERVO' },
    { name: 'motor', color: 0x6366f1, label: 'MOTOR' },
  ];

  const SLOT_POS = {
    controller: [-1.0, 0.25, 0.6],
    sensor: [1.0, 0.25, 0.6],
    servo: [-1.0, 0.25, -0.6],
    motor: [1.0, 0.25, -0.6],
  };

  const TRAY_POS = {
    controller: [-2.7, 1.0, 3.2],
    sensor: [-2.7, 0.0, 3.2],
    servo: [-2.7, -1.0, 3.2],
    motor: [-2.7, -2.0, 3.2],
  };

  SimCore.modules.robotics = {
    name: 'Robotics Assembly',
    desc: 'Mount the controller, sensor, servo and motor into the chassis, then power the unit up.',
    startMode: 'Pick a part from the tray',
    intro: 'Click a part on the tray to grab it, then click its labelled slot on the robot chassis. Drag to rotate the view.',
    tasks: [
      { title: 'Mount the controller', desc: 'Click the teal controller, then click the CONTROLLER slot.' },
      { title: 'Mount the sensor', desc: 'Mount the cyan sensor into its slot.' },
      { title: 'Mount the servo', desc: 'Mount the orange servo into its slot.' },
      { title: 'Mount the motor', desc: 'Mount the indigo motor into its slot.' },
      { title: 'Power up the unit', desc: 'Click the power button on the chest once all parts are mounted.' },
    ],
    hints: {
      any: [
        'Each part matches exactly one slot — read the labels, not just the colors.',
        'Click a tray part to select it, then click its slot to mount it.',
        'Mismatched parts cause a shake. Match by name to mount cleanly.',
      ],
    },

    build(core) {
      const world = core.world;
      const parts = {};
      const slots = {};

      /* robot chassis */
      const torso = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.75, 1.2, 24),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.6 })
      );
      torso.position.y = 0.3;
      world.add(torso);

      const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.6, 0.9),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.4 })
      );
      head.position.y = 1.35;
      world.add(head);

      const eyeMat = new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x22d3ee, emissiveIntensity: 0.6 });
      const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), eyeMat);
      eyeL.position.set(-0.2, 1.4, 0.46);
      const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), eyeMat);
      eyeR.position.set(0.2, 1.4, 0.46);
      world.add(eyeL, eyeR);

      /* power button */
      const powerMat = new THREE.MeshStandardMaterial({ color: 0x0f766e, emissive: 0x0f766e, emissiveIntensity: 0.35 });
      const powerBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.12, 16), powerMat);
      powerBtn.rotation.x = Math.PI / 2;
      powerBtn.position.set(0, 0.05, 0.76);
      powerBtn.userData.tag = 'power';
      core.clickables.push(powerBtn);
      const powerLabel = core.makeLabel('POWER', '#99f6e4');
      powerLabel.position.set(0, 0.35, 0.95);
      powerLabel.scale.set(1.5, 0.3, 1);
      powerLabel.userData.tag = 'power';
      core.clickables.push(powerLabel);
      world.add(powerBtn, powerLabel);

      /* slots */
      PARTS.forEach((p) => {
        const pad = new THREE.Mesh(
          new THREE.CircleGeometry(0.34, 28),
          new THREE.MeshStandardMaterial({ color: p.color, transparent: true, opacity: 0.35, roughness: 0.4, metalness: 0.3 })
        );
        pad.rotation.x = -Math.PI / 2;
        pad.position.set(SLOT_POS[p.name][0], SLOT_POS[p.name][1], SLOT_POS[p.name][2]);
        pad.userData.tag = 'slot:' + p.name;
        pad.userData.part = p.name;
        core.clickables.push(pad);

        const lbl = core.makeLabel(p.label, '#ffffff');
        lbl.position.set(SLOT_POS[p.name][0], SLOT_POS[p.name][1] + 0.42, SLOT_POS[p.name][2]);
        lbl.scale.set(1.8, 0.34, 1);
        world.add(pad, lbl);
        slots[p.name] = pad;
      });

      /* tray source (the click-to-pick part) */
      PARTS.forEach((p) => {
        const g = new THREE.Group();
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(0.55, 0.4, 0.55),
          new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.4, metalness: 0.5 })
        );
        g.add(box);
        const eye = new THREE.Mesh(
          new THREE.SphereGeometry(0.1, 12, 12),
          new THREE.MeshStandardMaterial({ color: 0x0b1220 })
        );
        eye.position.set(0, 0, 0.29);
        g.add(eye);
        const lbl = core.makeLabel(p.label, '#ffffff');
        lbl.position.y = 0.5;
        g.add(lbl);
        g.userData.tag = 'part:' + p.name;
        g.userData.part = p.name;
        g.position.set(TRAY_POS[p.name][0], TRAY_POS[p.name][1], TRAY_POS[p.name][2]);
        core.clickables.push(g);
        world.add(g);
        parts[p.name] = g;
      });

      core._parts = parts;
      core._slots = slots;
      core._mounted = {};
      core._selected = null;

      /* spark float animation */
      core._floats = Object.values(parts);
    },

    onClick(hit, core, ev) {
      const tag = hit.userData.tag;
      const s = core.state;

      if (tag === 'part:' + hit.userData.part) {
        if (core._mounted[hit.userData.part]) { core.flash(`${hit.userData.part} is already mounted.`); return; }
        if (core._selected === hit.userData.part) { core._selected = null; core.setMode('Pick a part from the tray'); core.flash('Dropped the part.'); return; }
        core._selected = hit.userData.part;
        core.state.moves += 0.5;
        core.updateHud();
        core.setMode(`Mounting ${hit.userData.part}`);
        core.flash(`Holding the ${hit.userData.part} — click its matching slot.`);
        return;
      }

      if (tag.startsWith('slot:')) {
        const slotName = tag.slice(5);
        if (core._selected === slotName) {
          /* mount it */
          const part = core._parts[slotName];
          const slot = core._slots[slotName];
          const padPos = slot.position;
          part.position.set(padPos.x, padPos.y + 0.15, padPos.z);
          part.visible = true;
          slot.material.opacity = 1;
          slot.material.color.set(slotName === 'servo' ? 0x0e7490 : 0x0f766e);
          core.state.moves += 0.5;
          core._selected = null;
          core._mounted[slotName] = true;
          core.completeTask();
          core.flash(`${slotName} mounted!`);
        } else if (core._selected) {
          core.flash(`That slot is for the ${slotName}. You are holding the ${core._selected}.`);
          core.state.moves += 0.5;
          core.updateHud();
        } else {
          core.flash('Pick a part from the tray first.');
        }
        return;
      }

      if (tag === 'power') {
        if (s.completed < 4) { core.flash('Mount all four parts before powering up.'); return; }
        core.state.moves += 0.5;
        core.completeTask();
        core.flash('Unit powered! All systems go. 🎉');
        core.setMode('Online');
      }
    },

    reset(core) {
      core._selected = null;
      PARTS.forEach((p) => {
        core._parts[p.name].position.set(TRAY_POS[p.name][0], TRAY_POS[p.name][1], TRAY_POS[p.name][2]);
        core._slots[p.name].material.opacity = 0.35;
      });
    },

    animate(core, dt) {
      const t = performance.now() / 1000;
      core._floats.forEach((p, i) => {
        p.rotation.y += dt * 1.2;
        p.position.y = TRAY_POS[p.userData.part][1] + Math.sin(t * 2 + i * 1.3) * 0.06;
      });
    },
  };
})();
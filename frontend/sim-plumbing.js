/* sim-plumbing.js — fit pipes: rotate to align the notch, then connect to the matching joint */
(function () {
  'use strict';

  SimCore.modules.plumbing = {
    name: 'Pipe Fitting',
    desc: 'Grab each pipe from the rack, rotate it so its notch lines up with the joint’s slot, then click the joint to lock it in.',
    startMode: 'Grab a pipe from the rack',
    intro: 'Click a pipe on the rack to grab it, click it again to rotate its notch 90°. Then click the matching blue joint on the wall to connect it.',
    tasks: [
      { title: 'Connect pipe 1', desc: 'Align the notch and lock the top joint.' },
      { title: 'Connect pipe 2', desc: 'Align the notch and lock the right joint.' },
      { title: 'Connect pipe 3', desc: 'Align the notch and lock the bottom joint.' },
      { title: 'Connect pipe 4', desc: 'Align the notch and lock the left joint.' },
    ],
    hints: {
      any: [
        'Each pipe has a yellow notch — it will only lock into the joint that matches its colour and slot angle.',
        'Select a pipe from the rack, click it to rotate the notch 90°, then click the wall joint.',
        'Joint slots are at 0°, 90°, 180° and 270°. Match the notch exactly.',
      ],
    },

    build(core) {
      const world = core.world;

      /* wall */
      const wall = new THREE.Mesh(
        new THREE.PlaneGeometry(7, 5.6),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 })
      );
      wall.position.set(0, 0.4, -2.6);
      world.add(wall);

      const JOINT = {
        j1: { name: '1', color: 0x60a5fa, pos: [0, 2.2, -2.65], rot: 0 },
        j2: { name: '2', color: 0x38bdf8, pos: [2.2, 0.4, -2.65], rot: 90 },
        j3: { name: '3', color: 0x818cf8, pos: [0, -1.4, -2.65], rot: 180 },
        j4: { name: '4', color: 0x34d399, pos: [-2.2, 0.4, -2.65], rot: 270 },
      };
      const RACK = { j1: [-2.65, 1.6, 0.55], j2: [-2.65, 0.4, 0.55], j3: [-2.65, -0.8, 0.55], j4: [-2.65, -2.0, 0.55] };
      const STARTROT = { j1: 90, j2: 0, j3: 270, j4: 180 };

      core._joints = {};
      Object.keys(JOINT).forEach((id) => {
        const j = JOINT[id];
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.42, 0.1, 12, 28),
          new THREE.MeshStandardMaterial({ color: j.color, roughness: 0.4, metalness: 0.4 })
        );
        ring.position.set(j.pos[0], j.pos[1], j.pos[2]);
        ring.rotation.y = Math.PI / 2;
        const tick = new THREE.Mesh(
          new THREE.BoxGeometry(0.16, 0.08, 0.05),
          new THREE.MeshStandardMaterial({ color: 0xfde047, emissive: 0xfde047, emissiveIntensity: 0.5 })
        );
        const rad = (j.rot * Math.PI) / 180;
        tick.position.set(j.pos[0] + Math.cos(rad) * 0.34, j.pos[1] + Math.sin(rad) * 0.34, j.pos[2] - 0.06);
        world.add(ring, tick);
        ring.userData.tag = 'joint:' + id;
        ring.userData.joint = id;
        core.clickables.push(ring);
        core._joints[id] = { ring: ring.position, rot: j.rot };
      });

      core._pipes = {};
      Object.keys(JOINT).forEach((id) => {
        const j = JOINT[id];
        const g = new THREE.Group();
        const spin = new THREE.Group();
        const cyl = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.14, 1.25, 16),
          new THREE.MeshStandardMaterial({ color: j.color, roughness: 0.4, metalness: 0.5 })
        );
        const lug = new THREE.Mesh(
          new THREE.BoxGeometry(0.16, 0.26, 0.16),
          new THREE.MeshStandardMaterial({ color: 0xfde047, emissive: 0xfde047, emissiveIntensity: 0.45 })
        );
        lug.position.set(0, 0.72, 0);
        cyl.add(lug);
        spin.add(cyl);
        g.add(spin);
        g.rotation.z = Math.PI / 2;
        g.position.set(RACK[id][0], RACK[id][1], RACK[id][2]);
        g.userData.tag = 'pipe:' + id;
        g.userData.pipe = id;
        core.clickables.push(g);
        world.add(g);
        core._pipes[id] = { group: g, spin, rot: STARTROT[id], color: j.color, rack: g.position.clone() };
        spin.rotation.y = (STARTROT[id] * Math.PI) / 180;
      });

      core._selectedPipe = null;
      core._mountedPipes = 0;
      core._rackPos = {};
      Object.keys(RACK).forEach((id) => { core._rackPos[id] = new THREE.Vector3(RACK[id][0], RACK[id][1], RACK[id][2]); });
    },

    onClick(hit, core) {
      const tag = hit.userData.tag;
      const s = core.state;

      if (tag && tag.startsWith('pipe:')) {
        const pid = tag.slice(5);
        if (core._selectedPipe === pid) {
          /* rotate the notch */
          s.moves += 0.5;
          core._pipes[pid].rot = (core._pipes[pid].rot + 90) % 360;
          core._pipes[pid].spin.rotation.y = (core._pipes[pid].rot * Math.PI) / 180;
          core.setMode(`Align the notch to the ${greenJoint(pid)}° slot`);
          core.flash(`Notch rotated to ${core._pipes[pid].rot}° — its slot wants ${greenJoint(pid)}°.`);
        } else {
          core._selectedPipe = pid;
          s.moves += 0.5;
          core.setMode('Click the matching joint to connect');
          core.flash(`Grabbed pipe ${pid.slice(1)} — click it again to rotate, or a joint to connect.`);
        }
        core.updateHud();
        return;
      }

      if (tag && tag.startsWith('joint:')) {
        const jid = tag.slice(6);
        const picked = core._selectedPipe;
        if (!picked) { core.flash('Grab a pipe from the rack first.'); return; }
        if (picked !== jid) {
          s.moves += 0.5;
          core.updateHud();
          core.flash(`That joint belongs to pipe ${jid.slice(1)} — you're holding pipe ${picked.slice(1)}.`);
          return;
        }
        const pipe = core._pipes[jid];
        if (pipe.rot === core._joints[jid].rot) {
          const pos = core._joints[jid].ring;
          pipe.group.position.set(pos.x, pos.y, -2.45);
          s.moves += 0.5;
          core._selectedPipe = null;
          core._mountedPipes += 1;
          core.completeTask();
          core.flash('Pipe locked in! 🚰');
        } else {
          s.moves += 0.5;
          core.updateHud();
          core.flash(`Notch at ${pipe.rot}° doesn't match the ${core._joints[jid].rot}° slot on this joint — rotate the pipe.`);
        }
        return;
      }
    },

    reset(core) {
      core._selectedPipe = null;
      core._mountedPipes = 0;
      Object.keys(core._pipes).forEach((id) => {
        const p = core._pipes[id];
        p.rot = { j1: 90, j2: 0, j3: 270, j4: 180 }[id];
        p.group.position.copy(core._rackPos[id]);
        p.spin.rotation.y = (p.rot * Math.PI) / 180;
      });
    },

    animate(core) {
      if (core._selectedPipe) {
        core._pipes[core._selectedPipe].group.position.y += Math.sin(performance.now() / 180) * 0.004;
      }
    },
  };

  function greenJoint(pid) {
    return { j1: 0, j2: 90, j3: 180, j4: 270 }[pid];
  }
})();
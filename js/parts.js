// Merges many small static parts into one mesh per material (fewer draw calls).

import * as THREE from './vendor/three.min.js';

export class PartBuilder {
  constructor() {
    this.parts = new Map();
  }
  // add a geometry with transform: p position, q quaternion | r euler array, s scale
  add(mat, geo, { p = [0, 0, 0], r = null, q = null, s = [1, 1, 1] } = {}) {
    const m = new THREE.Matrix4();
    const quat = q || new THREE.Quaternion().setFromEuler(new THREE.Euler(...(r || [0, 0, 0])));
    m.compose(new THREE.Vector3(...p), quat, new THREE.Vector3(...(Array.isArray(s) ? s : [s, s, s])));
    if (!this.parts.has(mat)) this.parts.set(mat, []);
    this.parts.get(mat).push({ geo, m });
  }
  build(group) {
    for (const [mat, list] of this.parts) {
      let total = 0;
      const prepared = list.map(({ geo, m }) => {
        const g = geo.index ? geo.toNonIndexed() : geo.clone();
        g.applyMatrix4(m);
        total += g.attributes.position.count;
        return g;
      });
      const pos = new Float32Array(total * 3);
      const nor = new Float32Array(total * 3);
      // keep vertex colours (painted bodies) – parts without colours count as white
      const withCol = mat.vertexColors && prepared.some((g) => g.attributes.color);
      const col = withCol ? new Float32Array(total * 3).fill(1) : null;
      let o = 0;
      for (const g of prepared) {
        pos.set(g.attributes.position.array, o * 3);
        nor.set(g.attributes.normal.array, o * 3);
        if (col && g.attributes.color && g.attributes.color.itemSize === 3) col.set(g.attributes.color.array, o * 3);
        o += g.attributes.position.count;
        g.dispose();
      }
      const out = new THREE.BufferGeometry();
      out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      if (col) out.setAttribute('color', new THREE.BufferAttribute(col, 3));
      out.computeBoundingSphere();
      group.add(new THREE.Mesh(out, mat));
    }
    
  }
}


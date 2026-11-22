// Converts an OBJ (no materials) to GLB in the browser: /tools/obj-para-glb.html?arquivo=/docs/referencias/dragonob.obj
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
const file = new URLSearchParams(location.search).get('arquivo');
const obj = await new OBJLoader().loadAsync(file);
obj.traverse((o) => { if (o.isMesh) { o.material = new THREE.MeshStandardMaterial({ color: 0xbfb6ab, roughness: 0.6 });
  // No texture in this OBJ: drop per-face normals/UVs so shared corners merge, then smooth normals.
  const g = o.geometry; g.deleteAttribute('normal'); g.deleteAttribute('uv');
  o.geometry = mergeVertices(g, 1e-4); o.geometry.computeVertexNormals(); } });
const glb = await new GLTFExporter().parseAsync(obj, { binary: true });
const bytes = new Uint8Array(glb);
let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
window.__glb = btoa(s);
const box = new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());
window.__info = { bytes: bytes.length, size: box.toArray().map((v) => +v.toFixed(2)) };
window.__ready = true;

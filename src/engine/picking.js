export function createPartPicker(root, partObjects) {
  const roots = [...new Set(Object.values(partObjects).flat())];
  const targets = [], intersections = [];

  function collect(object) {
    if (!object.visible) return;
    if (object.isMesh) {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      if (materials.some((material) => material?.visible)) targets.push(object);
    }
    for (const child of object.children) collect(child);
  }

  return (raycaster) => {
    targets.length = 0;
    intersections.length = 0;
    root.updateWorldMatrix(true, true);
    for (const part of roots) {
      let visible = true;
      for (let object = part.parent; object; object = object.parent) {
        if (!object.visible) { visible = false; break; }
      }
      if (visible) collect(part);
    }
    raycaster.intersectObjects(targets, false, intersections);
    let id = null;
    for (const hit of intersections) {
      const material = Array.isArray(hit.object.material) ? hit.object.material[hit.face.materialIndex] : hit.object.material;
      if (!material?.visible) continue;
      for (let object = hit.object; object; object = object.parent) {
        if (object.userData.part) { id = object.userData.part; break; }
      }
      if (id) break;
    }
    targets.length = 0;
    intersections.length = 0;
    return id;
  };
}

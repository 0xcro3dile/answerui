import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import type { SceneTheme } from "../protocol";

export function mount3d(title: string, theme: SceneTheme) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(devicePixelRatio);
  renderer.domElement.setAttribute("role", "img");
  renderer.domElement.setAttribute("aria-label", title);
  const labels = new CSS2DRenderer();
  labels.domElement.style.cssText = "position:absolute;inset:0;pointer-events:none";
  document.body.append(renderer.domElement, labels.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 1000);
  camera.position.set(0, 4, 10);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  const light = new THREE.DirectionalLight(0xffffff, 2);
  light.position.set(5, 10, 7);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.5), light);

  const view = { scene, camera };

  function resize() {
    renderer.setSize(innerWidth, innerHeight);
    labels.setSize(innerWidth, innerHeight);
    view.camera.aspect = innerWidth / innerHeight;
    view.camera.updateProjectionMatrix();
  }
  resize();
  addEventListener("resize", resize);

  /** Text that follows an object, just above it. */
  function label(object: THREE.Object3D, text: string) {
    const element = document.createElement("div");
    element.textContent = text;
    element.style.cssText = `color:${theme.text};font:500 13px system-ui,sans-serif`;
    const tag = new CSS2DObject(element);
    tag.center.set(0.5, 1.2);
    tag.position.y = new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3()).y / 2;
    object.add(tag);
    return tag;
  }

  return {
    globals: { THREE, scene, camera, controls, label },
    /** Shows a scene or camera the model made itself instead of the ready-made ones. */
    adopt(ownScene: unknown, ownCamera: unknown) {
      if (ownScene instanceof THREE.Scene) view.scene = ownScene;
      if (ownCamera instanceof THREE.PerspectiveCamera) {
        view.camera = ownCamera;
        controls.object = ownCamera;
        resize();
      }
    },
    render() {
      controls.update();
      renderer.render(view.scene, view.camera);
      labels.render(view.scene, view.camera);
    },
  };
}

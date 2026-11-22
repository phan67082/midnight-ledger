// input.js — one job: keyboard and mouse state. The game reads a plain
// object each tick; this file owns the listeners and nothing else.
export function createInput() {
  const keys = new Set();
  const input = {
    up: false,
    down: false,
    left: false,
    right: false,
    sprint: false,
    crouch: false,
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
  };
  const held = new Set();
  const pressed = new Set();

  function sync() {
    input.up = keys.has('KeyW') || keys.has('ArrowUp');
    input.down = keys.has('KeyS') || keys.has('ArrowDown');
    input.left = keys.has('KeyA') || keys.has('ArrowLeft');
    input.right = keys.has('KeyD') || keys.has('ArrowRight');
    input.sprint = keys.has('ShiftLeft') || keys.has('ShiftRight');
    input.crouch = keys.has('KeyC') || keys.has('ControlLeft');
  }

  function onKeyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (!e.repeat) pressed.add(e.code);
    keys.add(e.code);
    sync();
  }
  function onKeyUp(e) {
    keys.delete(e.code);
    sync();
  }
  function onMouseMove(e) {
    const rect = e.target.getBoundingClientRect();
    input.mouseX = e.clientX - rect.left;
    input.mouseY = e.clientY - rect.top;
  }
  function onMouseDown(e) {
    input.mouseDown = true;
    if (e.target) onMouseMove(e);
  }
  function onMouseUp() {
    input.mouseDown = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);

  // Edge-triggered keys: true once per physical press, consumed by the game.
  input.wasPressed = function (code) {
    return pressed.has(code);
  };
  input.consumePressed = function () {
    pressed.clear();
  };
  input.held = held;
  return input;
}

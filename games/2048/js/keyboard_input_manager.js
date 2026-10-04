// Adapted from Gabriele Cirulli's 2048 (MIT); see ../SOURCE.md and ../LICENSE.txt.
function KeyboardInputManager() {
  this.events = {};
  this.listen();
}
KeyboardInputManager.prototype.on = function (event, callback) {
  if (!this.events[event]) this.events[event] = [];
  this.events[event].push(callback);
};
KeyboardInputManager.prototype.emit = function (event, data) {
  var callbacks = this.events[event];
  if (callbacks) callbacks.forEach(function (callback) { callback(data); });
};
KeyboardInputManager.prototype.listen = function () {
  var self = this;
  var map = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3,
    w: 0, d: 1, s: 2, a: 3, k: 0, l: 1, j: 2, h: 3 };
  document.addEventListener("keydown", function (event) {
    var interactiveTarget = event.target.closest && event.target.closest("a,input,textarea,select,button:not([data-direction]),[role='button']");
    if (document.hidden || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
        event.target.isContentEditable || interactiveTarget) return;
    var mapped = map[event.key];
    if (mapped !== undefined) { event.preventDefault(); self.emit("move", mapped); }
    if (event.key === "r") self.restart(event);
  });
  this.bindButtonPress(".retry-button", this.restart);
  this.bindButtonPress(".restart-button", this.restart);
  this.bindButtonPress(".keep-playing-button", this.keepPlaying);
  document.querySelectorAll("[data-direction]").forEach(function (button) {
    self.bindButtonActivation(button, function () { self.emit("move", Number(button.dataset.direction)); });
  });
  var board = document.querySelector(".game-container");
  board.tabIndex = 0;
  board.setAttribute("role", "group");
  var start = null;
  board.addEventListener("pointerdown", function (event) {
    if (!event.isPrimary) { start = null; return; }
    if (event.button !== 0 || event.target.closest("button")) return;
    board.focus({ preventScroll: true });
    start = { x: event.clientX, y: event.clientY, id: event.pointerId };
    board.setPointerCapture(event.pointerId);
  });
  board.addEventListener("pointerup", function (event) {
    if (!start || event.pointerId !== start.id) return;
    var dx = event.clientX - start.x, dy = event.clientY - start.y;
    start = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 24) {
      self.emit("move", Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
    }
  });
  board.addEventListener("pointercancel", function () { start = null; });
  board.addEventListener("lostpointercapture", function () { start = null; });
  window.addEventListener("blur", function () { start = null; });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) start = null;
  });
};
KeyboardInputManager.prototype.restart = function (event) {
  event.preventDefault();
  this.emit("restart");
  document.querySelector(".game-container").focus({ preventScroll: true });
};
KeyboardInputManager.prototype.keepPlaying = function (event) {
  event.preventDefault();
  this.emit("keepPlaying");
};
KeyboardInputManager.prototype.bindButtonPress = function (selector, fn) {
  this.bindButtonActivation(document.querySelector(selector), fn.bind(this));
};
KeyboardInputManager.prototype.bindButtonActivation = function (button, activate) {
  var touchStart = null, lastTouchActivation = 0;
  button.addEventListener("pointerdown", function (event) {
    if (event.isPrimary && (event.pointerType === "touch" || event.pointerType === "pen")) {
      touchStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
    }
  });
  button.addEventListener("pointercancel", function () { touchStart = null; });
  button.addEventListener("pointerup", function (event) {
    if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
    var tap = touchStart && event.pointerId === touchStart.id &&
      Math.max(Math.abs(event.clientX - touchStart.x), Math.abs(event.clientY - touchStart.y)) < 16;
    touchStart = null;
    if (tap) {
      lastTouchActivation = Date.now();
      event.preventDefault();
      activate(event);
    }
  });
  button.addEventListener("click", function (event) {
    if (event.pointerType === "touch" || event.pointerType === "pen" ||
        (!event.pointerType && event.detail > 0 && Date.now() - lastTouchActivation < 500)) return;
    activate(event);
  });
};

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
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
        /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    var mapped = map[event.key];
    if (mapped !== undefined) { event.preventDefault(); self.emit("move", mapped); }
    if (event.key === "r") self.restart(event);
  });
  this.bindButtonPress(".retry-button", this.restart);
  this.bindButtonPress(".restart-button", this.restart);
  this.bindButtonPress(".keep-playing-button", this.keepPlaying);
  document.querySelectorAll("[data-direction]").forEach(function (button) {
    button.addEventListener("click", function () { self.emit("move", Number(button.dataset.direction)); });
  });
  var board = document.querySelector(".game-container");
  var start = null;
  board.addEventListener("pointerdown", function (event) {
    if (!event.isPrimary || event.target.closest("button")) return;
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
};
KeyboardInputManager.prototype.restart = function (event) {
  event.preventDefault();
  this.emit("restart");
};
KeyboardInputManager.prototype.keepPlaying = function (event) {
  event.preventDefault();
  this.emit("keepPlaying");
};
KeyboardInputManager.prototype.bindButtonPress = function (selector, fn) {
  document.querySelector(selector).addEventListener("click", fn.bind(this));
};
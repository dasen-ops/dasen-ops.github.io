window.fakeStorage = {
  _data: {},

  setItem: function (id, val) {
    return this._data[id] = String(val);
  },

  getItem: function (id) {
    return this._data.hasOwnProperty(id) ? this._data[id] : undefined;
  },

  removeItem: function (id) {
    return delete this._data[id];
  },

  clear: function () {
    return this._data = {};
  }
};

function LocalStorageManager() {
  this.bestScoreKey     = "xingya.2048.bestScore";
  this.gameStateKey     = "xingya.2048.gameState";

  var supported = this.localStorageSupported();
  this.storage = supported ? window.localStorage : window.fakeStorage;
}

LocalStorageManager.prototype.localStorageSupported = function () {
  var testKey = "xingya.2048.storageTest";

  try {
    var storage = window.localStorage;
    storage.setItem(testKey, "1");
    storage.removeItem(testKey);
    return true;
  } catch (error) {
    return false;
  }
};

// Best score getters/setters
LocalStorageManager.prototype.getBestScore = function () {
  return this.storage.getItem(this.bestScoreKey) || 0;
};

LocalStorageManager.prototype.setBestScore = function (score) {
  try { this.storage.setItem(this.bestScoreKey, score); }
  catch (error) { window.fakeStorage.setItem(this.bestScoreKey, score); this.storage = window.fakeStorage; }
};

// Game state getters/setters and clearing
LocalStorageManager.prototype.getGameState = function () {
  try {
    var stateJSON = this.storage.getItem(this.gameStateKey);
    if (!stateJSON) return null;
    var state = JSON.parse(stateJSON);
    if (!state || !state.grid || state.grid.size !== 4 || !Array.isArray(state.grid.cells) ||
        state.grid.cells.length !== 4 || !state.grid.cells.every(function (column) {
          return Array.isArray(column) && column.length === 4 && column.every(function (tile) {
            return !tile || (tile.position && Number.isInteger(tile.position.x) &&
              Number.isInteger(tile.position.y) && tile.position.x >= 0 && tile.position.x < 4 &&
              tile.position.y >= 0 && tile.position.y < 4 && Number.isInteger(tile.value) && tile.value >= 2);
          });
        }) || !Number.isFinite(state.score) || state.score < 0) return null;
    return state;
  } catch (error) { return null; }
};

LocalStorageManager.prototype.setGameState = function (gameState) {
  try { this.storage.setItem(this.gameStateKey, JSON.stringify(gameState)); }
  catch (error) { window.fakeStorage.setItem(this.gameStateKey, JSON.stringify(gameState)); this.storage = window.fakeStorage; }
};

LocalStorageManager.prototype.clearGameState = function () {
  try { this.storage.removeItem(this.gameStateKey); }
  catch (error) { window.fakeStorage.removeItem(this.gameStateKey); }
};

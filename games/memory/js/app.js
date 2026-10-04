// Page integration for MTrajK/memory-game (MIT); see ../SOURCE.md.
(function () {
  "use strict";
  var levels = {
    easy: { numFields: 9, numLights: 4, showingTime: 2000 },
    normal: { numFields: 16, numLights: 6, showingTime: 2400 },
    hard: { numFields: 25, numLights: 10, showingTime: 2800 }
  };
  var level = "easy", score = 0, elapsed = 0, startedAt = 0, timer = null, roundActive = false;
  var board = document.querySelector("#game-container");
  var status = document.querySelector("#game-status");
  var scoreLabel = document.querySelector("#score");
  var bestLabel = document.querySelector("#best-score");
  var elapsedLabel = document.querySelector("#elapsed");
  var progress = document.querySelector("#progress");
  var startButton = document.querySelector("#start-button");
  var bests = {};
  Object.keys(levels).forEach(function (key) {
    try { bests[key] = Number(localStorage.getItem("xingya.memory.best." + key)) || 0; }
    catch (error) { bests[key] = 0; }
  });

  function stopTimer() { clearInterval(timer); timer = null; }
  function updateTime() {
    elapsed = (performance.now() - startedAt) / 1000;
    elapsedLabel.textContent = elapsed.toFixed(1);
  }
  function createTimer() {
    startedAt = performance.now();
    status.textContent = "轮到你啦！找出刚才发亮的格子。";
    timer = setInterval(updateTime, 100);
  }
  function finish(win) {
    roundActive = false;
    if (timer !== null) updateTime();
    stopTimer();
    if (win) {
      score += Math.max(0, 500 - Math.floor(elapsed) * 10);
      if (score > bests[level]) {
        bests[level] = score;
        try { localStorage.setItem("xingya.memory.best." + level, String(score)); } catch (error) { /* Play without persistent storage. */ }
        status.textContent = "全找到了！你刷新了最高分！";
      } else status.textContent = "太棒了，全找到了！再挑战一次吧。";
      status.dataset.result = "win";
      if (window.DysonCelebrate) window.DysonCelebrate();
    } else {
      status.textContent = "差一点点！星星标出了遗漏的格子，再试一次吧。";
      status.dataset.result = "lose";
    }
    scoreLabel.textContent = score;
    bestLabel.textContent = bests[level];
    startButton.textContent = "再玩一次";
  }
  function resetLabels() {
    stopTimer(); score = 0; elapsed = 0;
    scoreLabel.textContent = "0"; elapsedLabel.textContent = "0.0";
    bestLabel.textContent = bests[level];
    progress.textContent = "找到：0 / " + levels[level].numLights;
    status.dataset.result = "";
    board.style.setProperty("--columns", Math.sqrt(levels[level].numFields));
  }
  function prepareBoard() {
    roundActive = false;
    Game.cancel(); resetLabels();
    board.innerHTML = "";
    for (var i = 0; i < levels[level].numFields; i++) {
      var wrapper = document.createElement("div"); wrapper.className = "field-" + level;
      var field = document.createElement("button"); field.type = "button";
      field.className = "field start"; field.disabled = true;
      field.setAttribute("aria-label", "第 " + (i + 1) + " 个格子");
      wrapper.appendChild(field); board.appendChild(wrapper);
    }
    status.textContent = "准备好了吗？先试着记住 " + levels[level].numLights + " 个格子。";
    startButton.textContent = "开始挑战";
  }
  function startGame() {
    resetLabels();
    roundActive = true;
    status.textContent = "仔细看！记住这 " + levels[level].numLights + " 个发亮的格子。";
    startButton.textContent = "重新开始";
    levels[level].progress = function (found, total) {
      score = found * 100; scoreLabel.textContent = score;
      progress.textContent = "找到：" + found + " / " + total;
    };
    levels[level].hidden = function () { status.textContent = "格子藏起来啦，马上轮到你！"; };
    Game.start(levels[level], level, board, createTimer, finish);
  }
  document.querySelectorAll("[data-level]").forEach(function (button) {
    button.addEventListener("click", function () {
      level = button.dataset.level;
      document.querySelectorAll("[data-level]").forEach(function (item) {
        item.setAttribute("aria-pressed", String(item === button));
      });
      prepareBoard();
    });
  });
  startButton.addEventListener("click", startGame);
  function leavePage() {
    if (roundActive) {
      prepareBoard();
      status.textContent = "刚才离开了页面，这局已重新准备。点“开始挑战”再玩吧。";
    } else {
      stopTimer(); Game.cancel();
      if (status.dataset.result === "lose") {
        board.querySelectorAll(".light").forEach(function (field) { field.classList.add("miss-transition"); });
      }
    }
  }
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) leavePage();
  });
  window.addEventListener("pagehide", leavePage);
  prepareBoard();
}());

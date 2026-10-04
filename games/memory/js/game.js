(function () {

    // Adapted from MTrajK/memory-game (MIT); see ../SOURCE.md and ../LICENSE.
    var fields = [], pressed, gameOptions, level, gameContainer, createTimer, stopTimerAndShowModal;
    var pendingTimeouts = [];

    function later(callback, delay) {
        pendingTimeouts.push(setTimeout(callback, delay));
    }

    function cancelGame() {
        pendingTimeouts.forEach(clearTimeout);
        pendingTimeouts = [];
        fields.forEach(function (field) {
            removeClass(field, 'allowed');
            field.disabled = true;
        });
    }

    function addClass(element, className) {
        element.classList.add(className);
    }

    function removeClass(element, className) {
        element.classList.remove(className);
    }

    function containsClass(element, className) {
        return element.classList.contains(className);
    }

    function stopGame(win) {
        fields.forEach(function (field) {
            removeClass(field, 'allowed');
            field.disabled = true;
        });

        stopTimerAndShowModal(win);
    }

    function fieldClickEventListener() {
        // in this case 'this' object is the clicked field element
        if (!containsClass(this, 'allowed'))
            return;

        removeClass(this, 'allowed');
        this.disabled = true;

        if (containsClass(this, 'light')) {
            removeClass(this, 'light');
            addClass(this, 'correct-transition');

            pressed++;
            this.setAttribute('aria-label', this.getAttribute('aria-label') + '，找对了');
            if (gameOptions.progress) gameOptions.progress(pressed, gameOptions.numLights);
            if (pressed == gameOptions.numLights)
                stopGame(true); // win
        } else {
            // lose
            addClass(this, 'wrong-transition');

            this.setAttribute('aria-label', this.getAttribute('aria-label') + '，这里没有亮过');
            later(function () {
                fields.forEach(function (field) {
                    if (containsClass(field, 'light'))
                        addClass(field, 'miss-transition');
                });
            }, 500);

            stopGame(false);
        }
    }

    function initGame() {
        cancelGame();
        gameContainer.innerHTML = '';

        fields = [];
        pressed = 0;

        for (var i = 0; i < gameOptions.numFields; i++) {
            // create new field
            var newField = document.createElement('button');
            newField.type = 'button';
            newField.disabled = true;
            newField.setAttribute('aria-label', '第 ' + (i + 1) + ' 个格子');
            newField.addEventListener('click', fieldClickEventListener);
            addClass(newField, 'field');
            addClass(newField, 'start');

            // append the new field to the dom
            var newElement = document.createElement('div');
            addClass(newElement, 'field-' + level);
            newElement.appendChild(newField);

            gameContainer.appendChild(newElement);
            fields.push(newField);
        }

        later(function () {
            // random select fields
            var leftLights = gameOptions.numLights;
            var leftFields = gameOptions.numFields;

            fields.forEach(function (field) {
                if (Math.random() < leftLights / leftFields) {
                    addClass(field, 'light');
                    addClass(field, 'shine');

                    leftLights--;
                }

                leftFields--;
            });
        }, 50); // these 50 ms are to be sure that all fields are loaded in the dom (so the anmation could be done)

        later(function () {
            // fade choosen fields
            fields.forEach(function (field) {
                removeClass(field, 'shine');
            });
            if (gameOptions.hidden) gameOptions.hidden();
        }, gameOptions.showingTime * 1.3);

        later(function () {
            // make clickable all fields
            fields.forEach(function (field) {
                removeClass(field, 'start');
                addClass(field, 'allowed');
                field.disabled = false;
            });

            createTimer();
        }, gameOptions.showingTime * 2.3);
    }

    function startGame(_gameOptions, _level, _gameContainer, _createTimer, _stopTimerAndShowModal) {
        gameOptions = _gameOptions;
        level = _level;
        gameContainer = _gameContainer;
        createTimer = _createTimer;
        stopTimerAndShowModal = _stopTimerAndShowModal;

        initGame();
    }

    window.Game = {
        start: startGame,
        restart: initGame,
        cancel: cancelGame
    };

}());

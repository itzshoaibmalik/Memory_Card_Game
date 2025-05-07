document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const elements = {
        views: {
            difficulty: document.getElementById('view-difficulty'),
            game: document.getElementById('view-game'),
        },
        buttons: {
            // Difficulty buttons replaced by container listener
            toggleAudio: document.getElementById('toggleButton'),
            settings: document.getElementById('settingsButton'),
            closeSettings: document.getElementById('closeSettingsBtn'),
            restart: document.getElementById('restart-button'),
            menu: document.getElementById('menu-button'),
            modalRestart: document.getElementById('modalRestartBtn'),
            modalMenu: document.getElementById('modalMenuBtn'),
        },
        containers: {
            difficultyOptions: document.querySelector('.difficulty-options-container'), // Listener target
            game: document.getElementById('game-container'),
            leaderboard: document.getElementById('leaderboard'),
            leaderboardModal: document.getElementById('leaderboardContainer'),
        },
        displays: {
            score: document.getElementById('score'),
            moves: document.getElementById('moves'),
            timer: document.getElementById('timer'),
            modalTitle: document.getElementById('modalTitle'),
            modalScore: document.getElementById('modalScore'),
            modalTime: document.getElementById('modalTime'),
            modalMoves: document.getElementById('modalMoves'),
        },
        audio: {
            click: document.getElementById('clickSound'),
            match: document.getElementById('matchSound'),
            win: document.getElementById('winSound'),
            background: document.getElementById('backgroundAudio'),
        },
        inputs: {
            musicSelect: document.getElementById('musicSelect'),
            cardBackSelect: document.getElementById('cardBackSelect'),
            themeSelect: document.getElementById('themeSelect'), // Added theme select
        },
        other: {
            settingsPanel: document.getElementById('settingsPanel'),
            overlay: document.getElementById('overlay'),
            modal: document.getElementById('gameOverModal'),
            particlesContainer: document.getElementById('particles-js'), // For particle init
        }
    };

    // --- Game State ---
    let state = {
        cards: [],
        firstCard: null,
        secondCard: null,
        lockBoard: false,
        matches: 0,
        score: 0,
        moves: 0,
        timerInterval: null,
        seconds: 0,
        currentDifficulty: null,
        cardImages: [],
        gameActive: false,
        audioMuted: true, // Default to muted
    };

    // --- Game Configuration ---
    const config = {
        difficulties: {
            easy: { name: 'Easy', cols: 4, rows: 4, pairs: 8, time: 120, cardSize: 100 },
            medium: { name: 'Medium', cols: 5, rows: 4, pairs: 10, time: 90, cardSize: 85 },
            hard: { name: 'Hard', cols: 6, rows: 5, pairs: 15, time: 75, cardSize: 75 },
        },
        baseImages: [ // Ensure you have at least 15 unique images
            'img/img1.jpg', 'img/img2.jpg', 'img/img3.jpg', 'img/img4.jpg',
            'img/img5.jpg', 'img/img6.jpg', 'img/img7.jpg', 'img/img8.jpg',
            'img/img9.jpg', 'img/img10.jpg', 'img/img11.jpg', 'img/img12.jpg',
            'img/img13.jpg', 'img/img14.jpg', 'img/img15.jpg',
            'img/img16.jpg', 'img/img17.jpg', 'img/img18.jpg', // Optional extras
        ],
        selectors: {
            card: '.card',
            flipped: '.flipped',
            matched: '.matched',
            difficultyCard: '.difficulty-card', // Selector for enhanced difficulty cards
        },
        storageKeys: {
            leaderboard: 'memoryGameLeaderboard_v2', // Updated key if structure changed
            music: 'memoryGameMusic_v2',
            cardBack: 'memoryGameCardBack_v2',
            theme: 'memoryGameTheme_v2', // Added theme key
        }
    };

    // --- Core Functions ---

    function switchView(viewToShow) {
        console.log("Switching view to:", viewToShow); // Debug
        Object.values(elements.views).forEach(view => view.classList.remove('active'));
        if (elements.views[viewToShow]) {
            elements.views[viewToShow].classList.add('active');
            // Trigger staggered animation if switching TO difficulty view
            if (viewToShow === 'difficulty') {
                 // The animation CSS now targets cards within an active view
            }
        } else {
            console.error("View not found:", viewToShow);
        }
    }

    function setupGame() {
        if (!state.currentDifficulty) {
             console.error("No difficulty selected!");
             switchView('difficulty');
             return;
         }
        console.log("Setting up game for difficulty:", state.currentDifficulty); // Debug
        resetGameState();
        const difficultyConfig = config.difficulties[state.currentDifficulty];
        state.seconds = difficultyConfig.time;

        prepareCardImages(difficultyConfig.pairs);
        if(!state.cardImages || state.cardImages.length === 0) {
            console.error("Failed to prepare card images. Aborting setup.");
            switchView('difficulty'); // Go back if images failed
            return;
        }

        setupGrid(difficultyConfig.cols, difficultyConfig.cardSize);

        elements.containers.game.innerHTML = ''; // Clear previous grid
        state.cardImages.forEach(imageSrc => {
            const card = createCardElement(imageSrc);
            elements.containers.game.appendChild(card);
        });
        state.cards = elements.containers.game.querySelectorAll(config.selectors.card);

        updateMovesDisplay();
        updateScoreDisplay();
        updateTimerDisplay();

        switchView('game');
        state.gameActive = true;
        startTimer();
    }

    function resetGameState() {
        console.log("Resetting game state."); // Debug
        state.cards = [];
        state.firstCard = null;
        state.secondCard = null;
        state.lockBoard = false;
        state.matches = 0;
        state.score = 0;
        state.moves = 0;
        clearInterval(state.timerInterval);
        state.timerInterval = null;
        state.seconds = 0;
        state.gameActive = false;
        // Don't reset currentDifficulty or loaded cardImages here
    }

    function prepareCardImages(pairCount) {
        console.log(`Preparing ${pairCount} pairs.`); // Debug
        const availableImages = [...config.baseImages];
        if (availableImages.length < pairCount) {
            console.error(`Error: Need ${pairCount} unique images, but only ${availableImages.length} provided.`);
            state.cardImages = []; // Ensure it's empty on failure
            // Maybe show an error message to the user here?
            alert(`Configuration Error: Not enough unique card images found for this difficulty (need ${pairCount})! Please check the image paths in script.js.`);
            return;
        }

        shuffleArray(availableImages);
        const selectedPairs = availableImages.slice(0, pairCount);
        state.cardImages = [...selectedPairs, ...selectedPairs];
        shuffleArray(state.cardImages);
        console.log("Card images prepared:", state.cardImages.length); // Debug
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    function setupGrid(columns, cardSizePx) {
        console.log(`Setting grid: ${columns} columns, ${cardSizePx}px card size.`); // Debug
        const container = elements.containers.game;
        container.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
        document.documentElement.style.setProperty('--card-size', `${cardSizePx}px`);
        const gap = Math.max(5, Math.min(10, Math.floor(cardSizePx / 10)));
        document.documentElement.style.setProperty('--grid-gap', `${gap}px`);
    }

    function createCardElement(imageSrc) {
        const card = document.createElement('div');
        card.classList.add('card');
        card.dataset.image = imageSrc;

        card.innerHTML = `
            <div class="card-face card-front"></div>
            <div class="card-face card-back">
                <img src="${imageSrc}" alt="Card Image" draggable="false">
            </div>
        `;
        const frontFace = card.querySelector('.card-front');
        if(frontFace) {
             // Get current computed value which might have been set by loadSettings
            const currentBack = getComputedStyle(document.documentElement).getPropertyValue('--card-back-image').trim();
             if (currentBack && currentBack !== 'initial') { // Check if it has a value
                 frontFace.style.backgroundImage = currentBack;
             } else {
                frontFace.style.backgroundImage = `url('img/imagebg.jpg')`; // Fallback
             }
        }

        card.addEventListener('click', handleCardClick);
        return card;
    }

    function handleCardClick() {
        if (state.lockBoard || !state.gameActive || this.classList.contains(config.selectors.flipped.substring(1)) || this.classList.contains(config.selectors.matched.substring(1)) || this === state.firstCard) {
            return;
        }
        console.log("Card clicked:", this.dataset.image); // Debug

        playSound(elements.audio.click);
        this.classList.add(config.selectors.flipped.substring(1));

        if (!state.firstCard) {
            state.firstCard = this;
        } else {
            state.secondCard = this;
            state.moves++;
            updateMovesDisplay();
            state.lockBoard = true;
            checkForMatch();
        }
    }

    function checkForMatch() {
        const isMatch = state.firstCard.dataset.image === state.secondCard.dataset.image;
        console.log("Checking match:", isMatch ? "Match!" : "No match."); // Debug

        if (isMatch) {
            playSound(elements.audio.match);
            state.matches++;
            state.score += 10;
            updateScoreDisplay();
            setTimeout(() => {
                disableMatchedCards();
                 if (state.matches === state.cardImages.length / 2) {
                    console.log("Game Won!"); // Debug
                    endGame(true);
                } else {
                    resetTurn();
                }
            }, 500);
        } else {
            setTimeout(unflipCards, 1000);
        }
    }

    function disableMatchedCards() {
        if (!state.firstCard || !state.secondCard) return; // Safety check
        state.firstCard.classList.remove(config.selectors.flipped.substring(1));
        state.secondCard.classList.remove(config.selectors.flipped.substring(1));
        state.firstCard.classList.add(config.selectors.matched.substring(1));
        state.secondCard.classList.add(config.selectors.matched.substring(1));
    }

    function unflipCards() {
        if (!state.firstCard || !state.secondCard) return; // Safety check
        state.firstCard.classList.remove(config.selectors.flipped.substring(1));
        state.secondCard.classList.remove(config.selectors.flipped.substring(1));
        resetTurn();
    }

    function resetTurn() {
        state.firstCard = null;
        state.secondCard = null;
        state.lockBoard = false;
        console.log("Turn reset."); // Debug
    }

    function startTimer() {
        console.log("Starting timer. Duration:", state.seconds); // Debug
        clearInterval(state.timerInterval);
        updateTimerDisplay();
        state.timerInterval = setInterval(() => {
            if (!state.gameActive) {
                 clearInterval(state.timerInterval);
                 return;
            }
            state.seconds--;
            updateTimerDisplay();
            if (state.seconds <= 0) {
                 console.log("Time's up!"); // Debug
                endGame(false);
            }
        }, 1000);
    }

    function endGame(isWin) {
        console.log("Ending game. Won:", isWin); // Debug
        state.gameActive = false;
        state.lockBoard = true;
        clearInterval(state.timerInterval);

        saveScoreToLeaderboard();

        setTimeout(() => {
            if (isWin && typeof confetti === 'function') {
                console.log("Launching confetti!"); // Debug
                playSound(elements.audio.win);
                confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
            }
            showModal(isWin);
        }, 500);
    }

    // --- UI Update Functions ---
    function updateScoreDisplay() {
        elements.displays.score.textContent = `Score: ${state.score}`;
    }
    function updateMovesDisplay() {
        elements.displays.moves.textContent = `Moves: ${state.moves}`;
    }
    function updateTimerDisplay() {
        elements.displays.timer.textContent = `Time: ${state.seconds}s`;
    }

    // --- Audio ---
    function playSound(audioElement) {
         if (!audioElement) return; // Skip if element doesn't exist

         if (audioElement === elements.audio.background) {
             // Background plays only if src is set and not muted
             if (audioElement.src && !state.audioMuted && audioElement.readyState >= 2) { // readyState check
                audioElement.play().catch(error => console.error(`Audio ${audioElement.id} playback error:`, error));
             }
         } else {
             // Other sounds play only if NOT muted
             if (!state.audioMuted && audioElement.readyState >= 2) { // readyState check
                audioElement.currentTime = 0; // Rewind click/match/win sounds
                 audioElement.play().catch(error => console.error(`Audio ${audioElement.id} playback error:`, error));
             }
         }
    }

    function toggleBackgroundMusic() {
         state.audioMuted = !state.audioMuted;
        elements.buttons.toggleAudio.textContent = state.audioMuted ? '🔇' : '🔊';
        console.log("Mute toggled. New state: ", state.audioMuted); // DEBUG

         if (state.audioMuted) {
            elements.audio.background.pause();
         } else {
             // Play ONLY if a valid track is selected in dropdown AND src is set
             const selectedMusic = elements.inputs.musicSelect.value;
            if (selectedMusic && selectedMusic !== 'disabled' && elements.audio.background.src) {
                 // Make sure it's loaded before playing if src was just set
                if (elements.audio.background.readyState >= 2) {
                    playSound(elements.audio.background); // Will check mute state internally now
                     console.log("Attempting to play on unmute: ", elements.audio.background.src); // DEBUG
                } else {
                     console.log("Waiting for audio to load before playing..."); // Debug
                     elements.audio.background.addEventListener('canplaythrough', () => playSound(elements.audio.background), { once: true });
                }
             } else {
                console.log("Not playing on unmute. Selection:", selectedMusic, " Src:", elements.audio.background.src); //DEBUG
             }
         }
    }

    function handleMusicSelection() {
         const selectedMusic = elements.inputs.musicSelect.value;
         localStorage.setItem(config.storageKeys.music, selectedMusic);
        console.log("Music selected:", selectedMusic); // DEBUG

         // Determine current source WITHOUT full path for comparison if needed
        let currentSrc = '';
         try { currentSrc = new URL(elements.audio.background.src).pathname; } catch (e) { /* ignore if src invalid */}
        const selectedSrcPath = selectedMusic ? `/${selectedMusic}` : ''; // Match format '/path/to/music.mp3'

        if (selectedMusic && selectedMusic !== 'disabled') {
             // Only change src if it's actually different or not set
            if (!elements.audio.background.src || !currentSrc.endsWith(selectedSrcPath)) {
                elements.audio.background.src = selectedMusic;
                console.log("Set background src to:", selectedMusic); // DEBUG
                elements.audio.background.load(); // Load the new source

                elements.audio.background.addEventListener('loadeddata', () => {
                    console.log("Audio loaded:", selectedMusic); // Debug
                    playSound(elements.audio.background); // Attempt play after loading (checks mute)
                 }, { once: true });
                elements.audio.background.addEventListener('error', (e) => {
                     console.error("Error loading audio source:", selectedMusic, e); // More detailed error
                     alert(`Error: Could not load music file: ${selectedMusic}. Please check the file path and format.`);
                 }, { once: true });
            } else if (!state.audioMuted && elements.audio.background.paused) {
                 // If same track was paused, play it
                playSound(elements.audio.background);
                console.log("Playing existing paused track."); //DEBUG
            } else if (state.audioMuted){
                console.log("Music selected but muted."); // DEBUG
             }
        } else {
             // "No Music" or "-- Select --" selected
             elements.audio.background.pause();
             elements.audio.background.removeAttribute('src');
            console.log("Music paused and src removed."); // DEBUG
             if (elements.buttons.toggleAudio.textContent === '🔊') {
                 elements.buttons.toggleAudio.textContent = '🔇';
                 state.audioMuted = true;
             }
        }
    }


    // --- Settings Panel ---
    function toggleSettingsPanel() {
        const isOpen = elements.other.settingsPanel.classList.contains('open');
        isOpen ? closeSettingsPanel() : openSettingsPanel();
    }

    function openSettingsPanel() {
        console.log("Opening settings."); // Debug
        elements.other.overlay.classList.add('active');
        elements.other.settingsPanel.classList.add('open');
        setTimeout(() => {
            elements.other.overlay.addEventListener('click', closeSettingsPanel, { once: true });
        }, 0);
    }

    function closeSettingsPanel() {
         console.log("Closing settings."); // Debug
        elements.other.settingsPanel.classList.remove('open');
        elements.other.overlay.classList.remove('active');
        elements.other.overlay.removeEventListener('click', closeSettingsPanel); // Clean up listener
    }

    function handleCardBackSelection() {
        const selectedBack = elements.inputs.cardBackSelect.value;
        console.log("Card back selected:", selectedBack); // Debug
        document.documentElement.style.setProperty('--card-back-image', `url('${selectedBack}')`);
        localStorage.setItem(config.storageKeys.cardBack, selectedBack);
        // If game is active, update existing card fronts (less efficient but ensures consistency)
         if (state.gameActive) {
             document.querySelectorAll('.card-front').forEach(front => {
                 front.style.backgroundImage = `url('${selectedBack}')`;
             });
         }
    }

    // --- Theme Selection ---
    function handleThemeSelection() {
        if (!elements.inputs.themeSelect) return; // Safety check if element doesn't exist
        const selectedTheme = elements.inputs.themeSelect.value || 'theme-default';
        console.log("Theme selected:", selectedTheme); // Debug

        // Create a list of possible theme classes to remove
        const themes = ['theme-default', 'theme-sunset', 'theme-light']; // Add any other theme classes here
        document.body.classList.remove(...themes); // Remove all potential theme classes

        document.body.classList.add(selectedTheme); // Add the currently selected one
        localStorage.setItem(config.storageKeys.theme, selectedTheme);
    }


    // --- Loading Settings ---
    function loadSettings() {
        console.log("Loading settings..."); // Debug
        // Load Theme First (as it might affect other visual defaults)
        const savedTheme = localStorage.getItem(config.storageKeys.theme) || 'theme-default';
        if (elements.inputs.themeSelect) { // Ensure theme select exists
            elements.inputs.themeSelect.value = savedTheme;
         }
        handleThemeSelection(); // Apply the loaded/default theme class to body

        // Load Music
        const savedMusic = localStorage.getItem(config.storageKeys.music); // Default handled by select HTML
        if (savedMusic && elements.inputs.musicSelect) { // Ensure music select exists
            elements.inputs.musicSelect.value = savedMusic;
            handleMusicSelection(); // This will set src but not play if muted
        }

        // Load Card Back
        const savedCardBack = localStorage.getItem(config.storageKeys.cardBack);
        if (savedCardBack && elements.inputs.cardBackSelect) { // Ensure card back select exists
            elements.inputs.cardBackSelect.value = savedCardBack;
        }
        // Apply default/saved card back immediately
        handleCardBackSelection();

        // Restore Muted State (Optional, if you want persistence)
        // const savedMute = localStorage.getItem('memoryGameMute_v1') === 'true';
        // state.audioMuted = savedMute;
        // elements.buttons.toggleAudio.textContent = state.audioMuted ? '🔇' : '🔊';
         // Set initial muted state icon correctly based on default
         elements.buttons.toggleAudio.textContent = state.audioMuted ? '🔇' : '🔊';

        console.log("Settings loaded. Muted:", state.audioMuted); // Debug
    }


    // --- Modal & Leaderboard ---
    function showModal(isWin) {
        console.log("Showing modal. Win:", isWin); // Debug
        if (!elements.other.modal) return; // Safety check
        elements.displays.modalTitle.textContent = isWin ? "🎉 You Won! 🎉" : "⌛ Game Over ⌛";
        elements.displays.modalScore.textContent = `Score: ${state.score}`;
        elements.displays.modalMoves.textContent = `Moves: ${state.moves}`;
        elements.displays.modalTime.textContent = `Time Left: ${state.seconds <= 0 ? 0 : state.seconds}s`;

        displayLeaderboard();

        elements.other.modal.classList.add('open');
        elements.other.overlay.classList.add('active');
    }

     window.closeModal = () => { // Make accessible globally for inline onclick
         console.log("Closing modal via 'x'."); // Debug
         if (!elements.other.modal) return;
         elements.other.modal.classList.remove('open');
         elements.other.overlay.classList.remove('active');
     };

    function saveScoreToLeaderboard() {
        const entry = {
            score: state.score,
            time: state.seconds > 0 ? state.seconds : 0,
            moves: state.moves,
            difficulty: config.difficulties[state.currentDifficulty]?.name || 'Unknown', // Add fallback
            timestamp: new Date().toISOString()
        };
        console.log("Saving score:", entry); // Debug
        let leaderboard = [];
        try {
             leaderboard = JSON.parse(localStorage.getItem(config.storageKeys.leaderboard)) || [];
         } catch (e) {
             console.error("Error parsing leaderboard from localStorage:", e);
             leaderboard = []; // Reset if corrupted
         }

        leaderboard.push(entry);
        leaderboard.sort((a, b) => b.score - a.score || a.moves - b.moves || b.time - a.time);
        leaderboard = leaderboard.slice(0, 5);
        try {
            localStorage.setItem(config.storageKeys.leaderboard, JSON.stringify(leaderboard));
        } catch (e) {
             console.error("Error saving leaderboard to localStorage:", e);
        }
    }

    function displayLeaderboard() {
        console.log("Displaying leaderboard."); // Debug
        if (!elements.containers.leaderboard) return; // Safety check
        elements.containers.leaderboard.innerHTML = ''; // Clear previous entries
        let leaderboardData = [];
         try {
             leaderboardData = JSON.parse(localStorage.getItem(config.storageKeys.leaderboard)) || [];
         } catch (e) {
            console.error("Error parsing leaderboard from localStorage:", e);
         }

        if (leaderboardData.length === 0) {
             elements.containers.leaderboard.innerHTML = '<p style="text-align: center; opacity: 0.7;">No scores yet!</p>';
             return;
         }

        leaderboardData.forEach((entry, index) => {
            const entryDiv = document.createElement('div');
            entryDiv.classList.add('entry');
            entryDiv.innerHTML = `
                 <span>${index + 1}.</span> [${entry.difficulty || 'N/A'}]
                 Score: <span>${entry.score ?? 0}</span> |
                 Moves: <span>${entry.moves ?? 0}</span> |
                 Time: <span>${entry.time ?? 0}s</span>
             `; // Added fallback values ?? 0 / N/A
             elements.containers.leaderboard.appendChild(entryDiv);
        });
    }


    // --- Event Listeners Setup ---
    function setupEventListeners() {
        console.log("Setting up event listeners."); // Debug

        // Difficulty Selection (Event Delegation)
        if (elements.containers.difficultyOptions) {
            elements.containers.difficultyOptions.addEventListener('click', (event) => {
                const clickedCard = event.target.closest(config.selectors.difficultyCard);
                if (clickedCard && clickedCard.dataset.difficulty) {
                    state.currentDifficulty = clickedCard.dataset.difficulty;
                    console.log("Difficulty selected via card:", state.currentDifficulty); // Debug
                    setupGame();
                }
            });
        } else {
             console.error("Difficulty options container not found for listener!");
        }


        // In-Game Buttons
        if(elements.buttons.restart) elements.buttons.restart.addEventListener('click', setupGame);
        if(elements.buttons.menu) elements.buttons.menu.addEventListener('click', () => {
            console.log("Menu button clicked."); // Debug
            // Optionally reset game state completely if going back to menu
            // resetGameState(); // If desired
            switchView('difficulty');
        });

        // Audio Toggle
        if(elements.buttons.toggleAudio) elements.buttons.toggleAudio.addEventListener('click', toggleBackgroundMusic);

        // Settings Panel
        if(elements.buttons.settings) elements.buttons.settings.addEventListener('click', openSettingsPanel); // Changed to open specific func
        if(elements.buttons.closeSettings) elements.buttons.closeSettings.addEventListener('click', closeSettingsPanel);
        if(elements.inputs.musicSelect) elements.inputs.musicSelect.addEventListener('change', handleMusicSelection);
        if(elements.inputs.cardBackSelect) elements.inputs.cardBackSelect.addEventListener('change', handleCardBackSelection);
        if(elements.inputs.themeSelect) elements.inputs.themeSelect.addEventListener('change', handleThemeSelection); // Listener for theme

        // Modal Buttons
        if(elements.buttons.modalRestart) elements.buttons.modalRestart.addEventListener('click', () => {
            closeModal();
            setupGame();
        });
        if(elements.buttons.modalMenu) elements.buttons.modalMenu.addEventListener('click', () => {
            closeModal();
            switchView('difficulty');
        });

        // Close modal/settings with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === "Escape") {
                 if (elements.other.settingsPanel?.classList.contains('open')) {
                     closeSettingsPanel();
                 } else if (elements.other.modal?.classList.contains('open')) {
                     closeModal();
                 }
            }
        });
    }

    // --- Initialization ---
    function initApp() {
        console.log("Initializing App..."); // Debug
         loadSettings(); // Load saved preferences first
         setupEventListeners(); // Attach listeners

        // Initialize particles
        if (typeof particlesJS !== 'undefined') {
            particlesJS('particles-js', {
                particles: {
                    number: { value: 80, density: { enable: true, value_area: 800 } },
                    color: { value: '#ffffff' },
                    shape: { type: 'circle' },
                    opacity: { value: 0.5, random: false },
                    size: { value: 3, random: true },
                    line_linked: {
                        enable: true,
                        distance: 150,
                        color: '#ffffff',
                        opacity: 0.4,
                        width: 1
                    },
                    move: {
                        enable: true,
                        speed: 2,
                        direction: 'none',
                        random: false,
                        straight: false,
                        out_mode: 'out',
                        bounce: false
                    }
                },
                interactivity: {
                    detect_on: 'canvas',
                    events: {
                        onhover: { enable: true, mode: 'repulse' },
                        onclick: { enable: true, mode: 'push' },
                        resize: true
                    }
                },
                retina_detect: true
            });
        }

        // Add new game features
        addPowerUps();
        addAchievements();
        setupEventListeners();
        loadSettings();
        switchView('difficulty');
         console.log("App Initialized."); // Debug
    }

    // Power-ups system
    function addPowerUps() {
        const powerUps = {
            reveal: {
                name: 'Reveal',
                icon: '👁️',
                description: 'Reveal all cards for 3 seconds',
                cooldown: 60,
                lastUsed: 0
            },
            shuffle: {
                name: 'Shuffle',
                icon: '🔄',
                description: 'Shuffle unmatched cards',
                cooldown: 45,
                lastUsed: 0
            },
            timeFreeze: {
                name: 'Time Freeze',
                icon: '⏸️',
                description: 'Freeze timer for 10 seconds',
                cooldown: 90,
                lastUsed: 0
            }
        };

        // Add power-ups UI
        const powerUpsContainer = document.createElement('div');
        powerUpsContainer.className = 'power-ups-container';
        powerUpsContainer.innerHTML = `
            <h3>Power-ups</h3>
            <div class="power-ups-grid">
                ${Object.entries(powerUps).map(([key, powerUp]) => `
                    <button class="power-up-btn" data-power="${key}" title="${powerUp.description}">
                        ${powerUp.icon}
                        <span class="cooldown"></span>
                    </button>
                `).join('')}
            </div>
        `;
        elements.containers.game.parentElement.insertBefore(powerUpsContainer, elements.containers.game);

        // Power-up handlers
        document.querySelectorAll('.power-up-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const powerUp = powerUps[btn.dataset.power];
                const now = Date.now();
                if (now - powerUp.lastUsed < powerUp.cooldown * 1000) {
                    showNotification(`Power-up on cooldown! Wait ${Math.ceil((powerUp.cooldown * 1000 - (now - powerUp.lastUsed)) / 1000)}s`);
                    return;
                }

                switch(btn.dataset.power) {
                    case 'reveal':
                        revealAllCards();
                        break;
                    case 'shuffle':
                        shuffleUnmatchedCards();
                        break;
                    case 'timeFreeze':
                        freezeTimer();
                        break;
                }
                powerUp.lastUsed = now;
                updatePowerUpCooldowns();
            });
        });
    }

    // Achievements system
    function addAchievements() {
        const achievements = {
            speedster: {
                name: 'Speedster',
                description: 'Complete a game in under 60 seconds',
                icon: '⚡',
                unlocked: false
            },
            perfect: {
                name: 'Perfect Match',
                description: 'Complete a game with no mismatches',
                icon: '🌟',
                unlocked: false
            },
            master: {
                name: 'Memory Master',
                description: 'Win 5 games in a row',
                icon: '👑',
                unlocked: false
            }
        };

        // Store achievements in localStorage
        if (!localStorage.getItem('achievements')) {
            localStorage.setItem('achievements', JSON.stringify(achievements));
        }

        // Check achievements on game end
        const originalEndGame = endGame;
        endGame = function(isWin) {
            originalEndGame(isWin);
            if (isWin) {
                checkAchievements();
            }
        };
    }

    // Helper functions for new features
    function revealAllCards() {
        const cards = Array.from(state.cards);
        cards.forEach(card => card.classList.add('flipped'));
        setTimeout(() => {
            cards.forEach(card => {
                if (!card.classList.contains('matched')) {
                    card.classList.remove('flipped');
                }
            });
        }, 3000);
    }

    function shuffleUnmatchedCards() {
        const unmatchedCards = Array.from(state.cards).filter(card => !card.classList.contains('matched'));
        const cardImages = unmatchedCards.map(card => card.dataset.image);
        shuffleArray(cardImages);
        unmatchedCards.forEach((card, index) => {
            card.dataset.image = cardImages[index];
            card.querySelector('.card-back img').src = cardImages[index];
        });
    }

    function freezeTimer() {
        const originalSeconds = state.seconds;
        clearInterval(state.timerInterval);
        setTimeout(() => {
            state.seconds = originalSeconds;
            startTimer();
        }, 10000);
    }

    function updatePowerUpCooldowns() {
        document.querySelectorAll('.power-up-btn').forEach(btn => {
            const powerUp = powerUps[btn.dataset.power];
            const now = Date.now();
            const timeLeft = Math.ceil((powerUp.cooldown * 1000 - (now - powerUp.lastUsed)) / 1000);
            const cooldownEl = btn.querySelector('.cooldown');
            if (timeLeft > 0) {
                cooldownEl.textContent = timeLeft;
                btn.disabled = true;
            } else {
                cooldownEl.textContent = '';
                btn.disabled = false;
            }
        });
    }

    function showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }

    function checkAchievements() {
        const achievements = JSON.parse(localStorage.getItem('achievements'));
        
        // Check Speedster achievement
        if (state.seconds > 0 && !achievements.speedster.unlocked) {
            achievements.speedster.unlocked = true;
            showAchievementUnlocked('Speedster');
        }

        // Check Perfect Match achievement
        if (state.moves === state.matches * 2 && !achievements.perfect.unlocked) {
            achievements.perfect.unlocked = true;
            showAchievementUnlocked('Perfect Match');
        }

        // Check Memory Master achievement
        const winStreak = parseInt(localStorage.getItem('winStreak') || '0') + 1;
        localStorage.setItem('winStreak', winStreak);
        if (winStreak >= 5 && !achievements.master.unlocked) {
            achievements.master.unlocked = true;
            showAchievementUnlocked('Memory Master');
        }

        localStorage.setItem('achievements', JSON.stringify(achievements));
    }

    function showAchievementUnlocked(achievementName) {
        const achievement = document.createElement('div');
        achievement.className = 'achievement-unlocked';
        achievement.innerHTML = `
            <div class="achievement-content">
                <span class="achievement-icon">🏆</span>
                <div class="achievement-text">
                    <h4>Achievement Unlocked!</h4>
                    <p>${achievementName}</p>
                </div>
            </div>
        `;
        document.body.appendChild(achievement);
        setTimeout(() => achievement.remove(), 5000);
    }

    initApp(); // Start the application

}); // End DOMContentLoaded
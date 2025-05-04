document.addEventListener('DOMContentLoaded', () => {
  const elements = {
      views: {
          difficulty: document.getElementById('view-difficulty'),
          game: document.getElementById('view-game'),
      },
      buttons: {
          difficulty: document.querySelectorAll('#view-difficulty button'),
          toggleAudio: document.getElementById('toggleButton'),
          settings: document.getElementById('settingsButton'),
          closeSettings: document.getElementById('closeSettingsBtn'),
          restart: document.getElementById('restart-button'),
          menu: document.getElementById('menu-button'),
          modalRestart: document.getElementById('modalRestartBtn'),
          modalMenu: document.getElementById('modalMenuBtn'),
      },
      containers: {
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
      },
      other: {
          settingsPanel: document.getElementById('settingsPanel'),
          overlay: document.getElementById('overlay'),
          modal: document.getElementById('gameOverModal'),
      }
  };

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
      audioMuted: true, 
  };

  const config = {
      difficulties: {
          easy: { name: 'Easy', cols: 4, rows: 4, pairs: 8, time: 120, cardSize: 100 },
          medium: { name: 'Medium', cols: 5, rows: 4, pairs: 10, time: 90, cardSize: 85 },
          hard: { name: 'Hard', cols: 6, rows: 5, pairs: 15, time: 75, cardSize: 75 },
      },
      baseImages: [ 
          'img/img1.jpg', 'img/img2.jpg', 'img/img3.jpg', 'img/img4.jpg',
          'img/img5.jpg', 'img/img6.jpg', 'img/img7.jpg', 'img/img8.jpg',
          'img/img9.jpg', 'img/img10.jpg', 'img/img11.jpg', 'img/img12.jpg',
          'img/img13.jpg', 'img/img14.jpg', 'img/img15.jpg', 
          'img/img16.jpg', 'img/img17.jpg', 'img/img18.jpg',
      ],
      selectors: {
          card: '.card',
          flipped: '.flipped',
          matched: '.matched',
      },
      storageKeys: {
          leaderboard: 'memoryGameLeaderboard_v1',
          music: 'memoryGameMusic_v1',
          cardBack: 'memoryGameCardBack_v1',
      }
  };


  function switchView(viewToShow) {
      Object.values(elements.views).forEach(view => view.classList.remove('active'));
      if (elements.views[viewToShow]) {
          elements.views[viewToShow].classList.add('active');
      } else {
          console.error("View not found:", viewToShow);
      }
  }

  function setupGame() {
      resetGameState();
      const difficultyConfig = config.difficulties[state.currentDifficulty];
      state.seconds = difficultyConfig.time;

      prepareCardImages(difficultyConfig.pairs);

      setupGrid(difficultyConfig.cols, difficultyConfig.cardSize);

      elements.containers.game.innerHTML = '';
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
  }

  function prepareCardImages(pairCount) {
      const availableImages = [...config.baseImages];
      if (availableImages.length < pairCount) {
          console.error(`Error: Need ${pairCount} unique images, but only ${availableImages.length} provided in config.baseImages.`);
          return; 
      }

      shuffleArray(availableImages);
      const selectedPairs = availableImages.slice(0, pairCount);
      state.cardImages = [...selectedPairs, ...selectedPairs];
      shuffleArray(state.cardImages);
  }

  function shuffleArray(array) {
      for (let i = array.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [array[i], array[j]] = [array[j], array[i]];
      }
  }

  function setupGrid(columns, cardSizePx) {
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
           frontFace.style.backgroundImage = getComputedStyle(document.documentElement).getPropertyValue('--card-back-image');
      }

      card.addEventListener('click', handleCardClick);
      return card;
  }

  function handleCardClick() {
      if (state.lockBoard || !state.gameActive || this.classList.contains(config.selectors.flipped.substring(1)) || this.classList.contains(config.selectors.matched.substring(1)) || this === state.firstCard) {
          return;
      }

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

      if (isMatch) {
          playSound(elements.audio.match);
          state.matches++;
          state.score += 10;
          updateScoreDisplay();
          setTimeout(() => {
              disableMatchedCards();
               if (state.matches === state.cardImages.length / 2) {
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
      state.firstCard.classList.remove(config.selectors.flipped.substring(1));
      state.secondCard.classList.remove(config.selectors.flipped.substring(1));
      state.firstCard.classList.add(config.selectors.matched.substring(1));
      state.secondCard.classList.add(config.selectors.matched.substring(1));
  }

  function unflipCards() {
      state.firstCard.classList.remove(config.selectors.flipped.substring(1));
      state.secondCard.classList.remove(config.selectors.flipped.substring(1));
      resetTurn();
  }

  function resetTurn() {
      state.firstCard = null;
      state.secondCard = null;
      state.lockBoard = false;
  }

  function startTimer() {
      clearInterval(state.timerInterval);
      updateTimerDisplay();
      state.timerInterval = setInterval(() => {
          if (!state.gameActive) return;
          state.seconds--;
          updateTimerDisplay();
          if (state.seconds <= 0) {
              endGame(false); 
          }
      }, 1000);
  }

  function endGame(isWin) {
      state.gameActive = false;
      state.lockBoard = true; 
      clearInterval(state.timerInterval);

      saveScoreToLeaderboard();

      setTimeout(() => {
          if (isWin && typeof confetti === 'function') {
              playSound(elements.audio.win);
              confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
          }
          showModal(isWin);
      }, 500);
  }

  function updateScoreDisplay() {
      elements.displays.score.textContent = `Score: ${state.score}`;
  }
  function updateMovesDisplay() {
      elements.displays.moves.textContent = `Moves: ${state.moves}`;
  }
  function updateTimerDisplay() {
      elements.displays.timer.textContent = `Time: ${state.seconds}s`;
  }

  function playSound(audioElement) {
       if (!state.audioMuted && audioElement) {
          audioElement.currentTime = 0;
           audioElement.play().catch(error => console.error("Audio playback error:", error));
       }
  }

   function toggleBackgroundMusic() {
       state.audioMuted = !state.audioMuted;
      elements.buttons.toggleAudio.textContent = state.audioMuted ? '🔇' : '🔊';
       if (state.audioMuted) {
          elements.audio.background.pause();
       } else {
           const selectedMusic = elements.inputs.musicSelect.value;
          if (selectedMusic && selectedMusic !== 'disabled' && elements.audio.background.src) {
              elements.audio.background.play().catch(e => console.error("Audio play error:", e));
          }
       }
   }

   function handleMusicSelection() {
       const selectedMusic = elements.inputs.musicSelect.value;
       localStorage.setItem(config.storageKeys.music, selectedMusic);

      if (selectedMusic && selectedMusic !== 'disabled') {
          elements.audio.background.src = selectedMusic;
          if (!state.audioMuted) {
              elements.audio.background.play().catch(e => console.error("Audio play error:", e));
          }
          if (state.audioMuted && elements.buttons.toggleAudio.textContent === '🔊') {
               elements.buttons.toggleAudio.textContent = '🔇';
          }
       } else {
           elements.audio.background.pause();
          elements.audio.background.removeAttribute('src'); // Clear source
          if (elements.buttons.toggleAudio.textContent === '🔊') {
               elements.buttons.toggleAudio.textContent = '🔇';
               state.audioMuted = true;
          }
       }
   }


  function toggleSettingsPanel() {
      const isOpen = elements.other.settingsPanel.classList.contains('open');
      if (isOpen) {
          closeSettingsPanel();
      } else {
          openSettingsPanel();
      }
  }

   function openSettingsPanel() {
      elements.other.overlay.classList.add('active');
       elements.other.settingsPanel.classList.add('open');
       setTimeout(() => {
           elements.other.overlay.addEventListener('click', closeSettingsPanel, { once: true });
      }, 0);
   }

  function closeSettingsPanel() {
       elements.other.settingsPanel.classList.remove('open');
      elements.other.overlay.classList.remove('active');
      elements.other.overlay.removeEventListener('click', closeSettingsPanel);
  }

   function handleCardBackSelection() {
      const selectedBack = elements.inputs.cardBackSelect.value;
      document.documentElement.style.setProperty('--card-back-image', `url('${selectedBack}')`);
      localStorage.setItem(config.storageKeys.cardBack, selectedBack);
   }

  function loadSettings() {
      const savedMusic = localStorage.getItem(config.storageKeys.music) || '';
       if (savedMusic) {
           elements.inputs.musicSelect.value = savedMusic;
          handleMusicSelection(); // Apply setting
       }

       const savedCardBack = localStorage.getItem(config.storageKeys.cardBack);
      if (savedCardBack) {
          elements.inputs.cardBackSelect.value = savedCardBack;
          handleCardBackSelection();
      } else {
          // Set default from CSS variable if nothing saved
          handleCardBackSelection();
       }
  }


  // --- Modal & Leaderboard ---
  function showModal(isWin) {
      elements.displays.modalTitle.textContent = isWin ? "🎉 You Won! 🎉" : "⌛ Game Over ⌛";
      elements.displays.modalScore.textContent = `Score: ${state.score}`;
      elements.displays.modalMoves.textContent = `Moves: ${state.moves}`;
      elements.displays.modalTime.textContent = `Time Left: ${state.seconds <= 0 ? 0 : state.seconds}s`; // Show 0 if time ran out

      displayLeaderboard(); // Populate leaderboard within modal

       elements.other.modal.classList.add('open');
      elements.other.overlay.classList.add('active'); // Also show overlay with modal
  }

   // Added a global closeModal function for the simple 'x' button
   window.closeModal = () => {
      elements.other.modal.classList.remove('open');
      elements.other.overlay.classList.remove('active');
   };

  function saveScoreToLeaderboard() {
      const entry = {
          score: state.score,
          time: state.seconds > 0 ? state.seconds : 0, // Time remaining
          moves: state.moves,
          difficulty: config.difficulties[state.currentDifficulty].name,
          timestamp: new Date().toISOString()
      };
      let leaderboard = JSON.parse(localStorage.getItem(config.storageKeys.leaderboard)) || [];
      leaderboard.push(entry);
      leaderboard.sort((a, b) => b.score - a.score || a.moves - b.moves || b.time - a.time); // Sort: Score(desc), Moves(asc), TimeLeft(desc)
      leaderboard = leaderboard.slice(0, 5); // Keep Top 5
      localStorage.setItem(config.storageKeys.leaderboard, JSON.stringify(leaderboard));
  }

   function displayLeaderboard() {
      elements.containers.leaderboard.innerHTML = ''; // Clear previous entries
      const leaderboardData = JSON.parse(localStorage.getItem(config.storageKeys.leaderboard)) || [];

      if (leaderboardData.length === 0) {
           elements.containers.leaderboard.innerHTML = '<p style="text-align: center; opacity: 0.7;">No scores yet!</p>';
           return;
       }

      leaderboardData.forEach((entry, index) => {
          const entryDiv = document.createElement('div');
          entryDiv.classList.add('entry');
           // Highlight user score if implemented
          entryDiv.innerHTML = `
               <span>${index + 1}.</span> [${entry.difficulty}]
               Score: <span>${entry.score}</span> |
               Moves: <span>${entry.moves}</span> |
               Time: <span>${entry.time}s</span>
           `;
           elements.containers.leaderboard.appendChild(entryDiv);
      });
   }


  // --- Event Listeners Setup ---
  function setupEventListeners() {
      // Difficulty Selection
      elements.buttons.difficulty.forEach(button => {
          button.addEventListener('click', () => {
              state.currentDifficulty = button.dataset.difficulty;
              setupGame();
          });
      });

      // In-Game Buttons
      elements.buttons.restart.addEventListener('click', setupGame); // Restarts current difficulty
      elements.buttons.menu.addEventListener('click', () => switchView('difficulty')); // Go back to difficulty screen

      // Audio Toggle
      elements.buttons.toggleAudio.addEventListener('click', toggleBackgroundMusic);

      // Settings Panel
      elements.buttons.settings.addEventListener('click', openSettingsPanel);
      elements.buttons.closeSettings.addEventListener('click', closeSettingsPanel);
      elements.inputs.musicSelect.addEventListener('change', handleMusicSelection);
      elements.inputs.cardBackSelect.addEventListener('change', handleCardBackSelection);

      // Modal Buttons
      elements.buttons.modalRestart.addEventListener('click', () => {
          closeModal();
          setupGame(); // Restarts current difficulty
      });
      elements.buttons.modalMenu.addEventListener('click', () => {
          closeModal();
          switchView('difficulty');
      });

       // Close modal/settings with Escape key
      document.addEventListener('keydown', (e) => {
          if (e.key === "Escape") {
              if (elements.other.settingsPanel.classList.contains('open')) {
                  closeSettingsPanel();
              } else if (elements.other.modal.classList.contains('open')) {
                  closeModal();
              }
          }
      });
  }

  // --- Initialization ---
  loadSettings(); // Load saved preferences first
  setupEventListeners();
  switchView('difficulty'); // Start at the difficulty selection screen

}); // End DOMContentLoaded
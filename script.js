const player = document.getElementById('player');
const notesContainer = document.getElementById('notes-container');
const scoreDisplay = document.getElementById('score');
const levelDisplay = document.getElementById('level');
const finalScoreDisplay = document.getElementById('final-score');
const startButton = document.getElementById('start-button');
const resetButton = document.getElementById('reset-button');
const gameOverScreen = document.getElementById('game-over');
const stave = document.querySelector('.stave');

let score = 0;
let level = 1;
let gameInterval;
let noteInterval;
let playerPosition = 2; // 0-4, representing stave lines
const staveLines = [10, 30, 50, 70, 90]; // Percentage positions for stave lines

// Web Audio API context
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Function to generate 8-bit sounds
function playTone(frequency, duration) {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.frequency.value = frequency; // Set the frequency of the tone
  oscillator.type = 'square'; // Use a square wave for 8-bit sound

  // Connect the oscillator to the gain node and the gain node to the audio context destination
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // Start the oscillator
  oscillator.start();

  // Stop the oscillator after the specified duration
  setTimeout(() => {
    oscillator.stop();
  }, duration);

  // Fade out the sound to avoid clicks
  gainNode.gain.setValueAtTime(1, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration / 1000);
}

// Full melody for "Happy Birthday to You"
const melodyFrequencies = [
  261.63, 261.63, 293.66, 261.63, 349.23, 329.63, // C4, C4, D4, C4, F4, E4
  261.63, 261.63, 293.66, 261.63, 392.00, 349.23, // C4, C4, D4, C4, G4, F4
  261.63, 261.63, 523.25, 440.00, 349.23, 329.63, // C4, C4, C5, A4, F4, E4
  293.66, 293.66, 440.00, 349.23, 392.00, 349.23  // D4, D4, A4, F4, G4, F4
];

// Map frequencies to stave lines (higher frequencies on upper lines)
const frequencyToLine = {
  261.63: 2, // C4: Middle line
  293.66: 1, // D4: Second line
  329.63: 3, // E4: Fourth line
  349.23: 0, // F4: Top line
  392.00: 1, // G4: Second line
  440.00: 0, // A4: Top line
  523.25: 0  // C5: Top line (highest note)
};

// Tempo variables
let initialSpawnInterval = 1000; // Start with 1 second between notes
let minSpawnInterval = 300; // Minimum interval between notes
let noteSpeed = 2; // Initial speed of notes (pixels per frame)
let speedIncrease = 0.1; // Speed increase per level

// Move player up and down with keyboard
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp' && playerPosition > 0) {
    playerPosition--;
    player.style.top = `${staveLines[playerPosition]}%`;
  } else if (e.key === 'ArrowDown' && playerPosition < 4) {
    playerPosition++;
    player.style.top = `${staveLines[playerPosition]}%`;
  }
});

// Move player with touch
stave.addEventListener('touchstart', (e) => {
  e.preventDefault(); // Prevent default touch behavior
  const touchY = e.touches[0].clientY; // Get the Y position of the touch
  movePlayerToLine(touchY); // Move the player to the tapped line
});

// Function to move the player to the tapped line
function movePlayerToLine(touchY) {
  const staveRect = stave.getBoundingClientRect();
  const staveHeight = staveRect.height;
  const relativeY = touchY - staveRect.top; // Y position relative to the stave

  // Determine which line was tapped based on the relative Y position
  if (relativeY < staveHeight * 0.2) {
    playerPosition = 0; // Top line
  } else if (relativeY < staveHeight * 0.4) {
    playerPosition = 1; // Second line
  } else if (relativeY < staveHeight * 0.6) {
    playerPosition = 2; // Middle line
  } else if (relativeY < staveHeight * 0.8) {
    playerPosition = 3; // Fourth line
  } else {
    playerPosition = 4; // Bottom line
  }

  // Move the player to the new position
  player.style.top = `${staveLines[playerPosition]}%`;
}

// Start game
startButton.addEventListener('click', () => {
  startGame();
  startButton.classList.add('hidden'); // Hide start button after clicking
});

// Reset game
resetButton.addEventListener('click', () => {
  resetGame();
});

function startGame() {
  score = 0;
  level = 1;
  scoreDisplay.textContent = score;
  levelDisplay.textContent = level;
  gameOverScreen.classList.add('hidden');
  startButton.classList.add('hidden'); // Hide start button
  playerPosition = 2;
  player.style.top = `${staveLines[playerPosition]}%`;

  // Reset tempo variables
  initialSpawnInterval = 1000;
  noteSpeed = 2;

  // Clear existing notes
  notesContainer.innerHTML = '';

  // Spawn notes in the correct order
  let melodyIndex = 0; // Define melodyIndex here
  noteInterval = setInterval(() => {
    spawnNote(melodyFrequencies[melodyIndex]);
    melodyIndex = (melodyIndex + 1) % melodyFrequencies.length; // Loop through the melody
  }, initialSpawnInterval);

  // Game loop
  gameInterval = setInterval(() => {
    const notes = document.querySelectorAll('.note');
    notes.forEach(note => {
      const noteRect = note.getBoundingClientRect();
      const playerRect = player.getBoundingClientRect();

      // Check for collision
      if (
        noteRect.left < playerRect.right &&
        noteRect.right > playerRect.left &&
        noteRect.top < playerRect.bottom &&
        noteRect.bottom > playerRect.top
      ) {
        collectNote(note);
      } else if (noteRect.right < playerRect.left) {
        // Note missed
        endGame();
      }

      // Move note left
      note.style.left = `${parseInt(note.style.left) - noteSpeed}px`;
    });
  }, 20);
}

function spawnNote(frequency) {
  const note = document.createElement('div');
  note.classList.add('note');
  const line = frequencyToLine[frequency]; // Get the line for the frequency
  note.style.top = `${staveLines[line]}%`;
  note.style.left = '580px';
  note.dataset.frequency = frequency;
  note.textContent = '♪'; // Add a musical note symbol
  notesContainer.appendChild(note);
}

function collectNote(note) {
  const frequency = parseFloat(note.dataset.frequency);
  playTone(frequency, 300); // Play the corresponding tone
  note.remove();
  score++;
  scoreDisplay.textContent = score;

  // Increase level every 25 points
  if (score % 25 === 0) {
    level++;
    levelDisplay.textContent = level;

    // Increase tempo
    if (initialSpawnInterval > minSpawnInterval) {
      initialSpawnInterval -= 100; // Decrease spawn interval
      noteSpeed += speedIncrease; // Increase note speed
      clearInterval(noteInterval); // Clear the current interval

      // Recreate the noteInterval with the updated spawn interval
      let melodyIndex = 0; // Define melodyIndex here
      noteInterval = setInterval(() => {
        spawnNote(melodyFrequencies[melodyIndex]);
        melodyIndex = (melodyIndex + 1) % melodyFrequencies.length; // Loop through the melody
      }, initialSpawnInterval);
    }
  }
}

function endGame() {
  clearInterval(gameInterval);
  clearInterval(noteInterval);
  finalScoreDisplay.textContent = score;
  gameOverScreen.classList.remove('hidden');
}

function resetGame() {
  gameOverScreen.classList.add('hidden');
  startGame();
}

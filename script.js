const playlists = [
  "Chill",
  "Workout",
  "Focus",
];

const container = document.getElementById("playlist-container");
const currentSong = document.getElementById("current-song");
const playBtn = document.getElementById("play");
const nextBtn = document.getElementById("next");
const prevBtn = document.getElementById("prev");

let audio = new Audio();
let currentPlaylist = [];
let currentIndex = 0;
let isPlaying = false;

// Render playlists
playlists.forEach(name => {
  const div = document.createElement("div");
  div.className = "playlist";
  div.innerText = name;
  div.onclick = () => loadPlaylist(name);
  container.appendChild(div);
});

async function loadPlaylist(name) {
  const url = `playlists/${name}/`;
  currentPlaylist = [];

  // Fetch list of songs (GitHub Pages doesn't support directory listing)
  // So you manually list them in script.js or use a JSON manifest.
  // Example below assumes fixed files:
  currentPlaylist = [
    `${url}song1.mp3`,
    `${url}song2.mp3`,
  ];

  currentIndex = 0;
  playSong();
}

function playSong() {
  if (currentPlaylist.length === 0) return;
  audio.src = currentPlaylist[currentIndex];
  currentSong.textContent = `🎵 ${currentPlaylist[currentIndex].split("/").pop()}`;
  audio.play();
  isPlaying = true;
  playBtn.textContent = "⏸";
}

playBtn.onclick = () => {
  if (!audio.src) return;
  if (isPlaying) {
    audio.pause();
    playBtn.textContent = "▶️";
  } else {
    audio.play();
    playBtn.textContent = "⏸";
  }
  isPlaying = !isPlaying;
};

nextBtn.onclick = () => {
  if (currentPlaylist.length === 0) return;
  currentIndex = (currentIndex + 1) % currentPlaylist.length;
  playSong();
};

prevBtn.onclick = () => {
  if (currentPlaylist.length === 0) return;
  currentIndex = (currentIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
  playSong();
};

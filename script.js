const GITHUB_USER = "YousefTantawy";
const REPO = "MediaPlayer";
const API_URL = `https://api.github.com/repos/${GITHUB_USER}/${REPO}/contents/`;
const BASE_URL = `https://raw.githubusercontent.com/${GITHUB_USER}/${REPO}/main/`;

const playlistContainer = document.getElementById("playlist-container");
const player = document.getElementById("audio-player");
const songTitle = document.getElementById("song-title");
const playBtn = document.getElementById("play-btn");
const pauseBtn = document.getElementById("pause-btn");
const nextBtn = document.getElementById("next-btn");
const prevBtn = document.getElementById("prev-btn");

let playlists = {};
let currentPlaylist = null;
let currentSongIndex = 0;

// Fetch folders (playlists)
async function fetchPlaylists() {
  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    const folders = data.filter(item => item.type === "dir");

    for (const folder of folders) {
      await fetchSongs(folder.name);
    }

    renderPlaylists();
  } catch (error) {
    console.error("Error fetching playlists:", error);
  }
}

// Fetch songs inside each folder
async function fetchSongs(folder) {
  try {
    const response = await fetch(`${API_URL}${folder}`);
    const data = await response.json();

    const songs = data
      .filter(item => item.name.toLowerCase().endsWith(".mp3"))
      .map(item => ({
        name: item.name.replace(".mp3", ""),
        url: `${BASE_URL}${folder}/${item.name}`
      }));

    if (songs.length > 0) {
      playlists[folder] = songs;
    }
  } catch (error) {
    console.error(`Error fetching songs in ${folder}:`, error);
  }
}

// Render playlists and songs dynamically
function renderPlaylists() {
  playlistContainer.innerHTML = "";

  Object.keys(playlists).forEach(folder => {
    const playlistDiv = document.createElement("div");
    playlistDiv.className = "playlist";

    const title = document.createElement("h2");
    title.textContent = folder;
    playlistDiv.appendChild(title);

    const songList = document.createElement("ul");

    playlists[folder].forEach((song, index) => {
      const li = document.createElement("li");
      li.textContent = song.name;
      li.addEventListener("click", () => playSong(folder, index));
      songList.appendChild(li);
    });

    playlistDiv.appendChild(songList);
    playlistContainer.appendChild(playlistDiv);
  });
}

// Play a specific song
function playSong(folder, index) {
  currentPlaylist = folder;
  currentSongIndex = index;
  const song = playlists[folder][index];

  player.src = song.url;
  player.play();
  songTitle.textContent = `🎵 ${song.name}`;
}

// Controls
playBtn.addEventListener("click", () => player.play());
pauseBtn.addEventListener("click", () => player.pause());
nextBtn.addEventListener("click", nextSong);
prevBtn.addEventListener("click", prevSong);

function nextSong() {
  if (!currentPlaylist) return;
  currentSongIndex = (currentSongIndex + 1) % playlists[currentPlaylist].length;
  playSong(currentPlaylist, currentSongIndex);
}

function prevSong() {
  if (!currentPlaylist) return;
  currentSongIndex =
    (currentSongIndex - 1 + playlists[currentPlaylist].length) %
    playlists[currentPlaylist].length;
  playSong(currentPlaylist, currentSongIndex);
}

// Load playlists on start
fetchPlaylists();

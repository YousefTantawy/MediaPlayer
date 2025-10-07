// script.js - GitHub-driven Spotify-like player (no volume control)

// ---------------- CONFIG ----------------
const GITHUB_USER = 'YousefTantawy';
const GITHUB_REPO = 'MediaPlayer';
let GITHUB_BRANCH = 'main'; // change if repo default branch is different
// ----------------------------------------

/* DOM */
const playlistsEl = document.getElementById('playlists');
const songsWrap = document.getElementById('songsWrap');
const queueList = document.getElementById('queueList');
const audio = document.getElementById('audio');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const seek = document.getElementById('seek');
const timeLabel = document.getElementById('timeLabel');
const nowPlaying = document.getElementById('nowPlaying');
document.getElementById('ghUser').textContent = GITHUB_USER;
document.getElementById('ghRepo').textContent = GITHUB_REPO;

/* state */
let library = {};    // { playlistName: [ {name, path, url} ] }
let playlists = [];  // ordered playlist names
let currentPlaylist = null;
let currentIndex = null;
let queue = [];      // [{playlist, index, item}]
let isSeeking = false;

// format mm:ss
function fmtTime(t){
  if (!isFinite(t)) return '00:00';
  const s = Math.floor(t);
  const m = Math.floor(s/60);
  const sec = s % 60;
  return `${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
}

// GitHub API request helper
async function ghFetch(path = ''){
  const url = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${encodeURIComponent(path)}?ref=${GITHUB_BRANCH}`;
  const r = await fetch(url);
  if (r.status === 404) throw new Error('Repo or path not found (404). Check repo/branch.');
  if (r.status === 403) {
    const txt = await r.text();
    throw new Error('GitHub API rate limit or access denied: ' + txt.slice(0,200));
  }
  return r.json();
}
function rawUrlFor(path){
  return `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${path}`;
}

// Build library by listing root, reading directories, gathering mp3 files
async function buildLibrary(){
  try {
    nowPlaying.textContent = 'Loading repository...';
    const root = await ghFetch('');
    const dirs = root.filter(it => it.type === 'dir');
    const rootFiles = root.filter(it => it.type==='file' && /\.(mp3|wav|ogg|m4a)$/i.test(it.name));

    library = {};
    playlists = [];

    if (rootFiles.length){
      library['Root'] = rootFiles.map(f => ({ name: f.name, path: f.path, url: rawUrlFor(f.path) }));
      playlists.push('Root');
    }

    for (const d of dirs){
      try {
        const sub = await ghFetch(d.path);
        const mp3s = sub.filter(it => it.type==='file' && /\.(mp3|wav|ogg|m4a)$/i.test(it.name))
                        .map(f => ({ name: f.name, path: f.path, url: rawUrlFor(f.path) }));
        if (mp3s.length){
          library[d.name] = mp3s;
          playlists.push(d.name);
        }
      } catch (e) {
        console.warn('Failed to list directory', d.path, e);
      }
    }

    if (!playlists.length){
      document.getElementById('status').textContent = 'No playlists or MP3s found in repo.';
      songsWrap.innerHTML = '<div class="muted">Add folders and MP3s to the repo to create playlists.</div>';
      playlistsEl.innerHTML = '';
      nowPlaying.textContent = 'No songs found';
      return;
    }

    renderPlaylists();
    selectPlaylist(playlists[0]);
    nowPlaying.textContent = 'Ready — select a song';
    document.getElementById('status').textContent = `Loaded ${playlists.length} playlists`;
  } catch (err){
    console.error(err);
    nowPlaying.textContent = 'Error loading repo: ' + err.message;
    songsWrap.innerHTML = `<div class="muted">Error: ${err.message}</div>`;
    document.getElementById('status').textContent = 'Error loading repo';
  }
}

// UI renderers
function renderPlaylists(){
  playlistsEl.innerHTML = '';
  for (const pl of playlists){
    const cnt = library[pl].length;
    const el = document.createElement('div');
    el.className = 'playlist-item' + (pl===currentPlaylist ? ' active' : '');
    el.innerHTML = `<div style="flex:1;overflow:hidden;text-overflow:ellipsis">${pl}</div><div class="small">${cnt}</div>`;
    el.onclick = () => selectPlaylist(pl);
    playlistsEl.appendChild(el);
  }
}

function selectPlaylist(name){
  currentPlaylist = name;
  renderPlaylists();
  renderSongs();
  document.getElementById('heading').textContent = name;
  document.getElementById('subinfo').textContent = `${library[name].length} songs`;
}

function renderSongs(){
  songsWrap.innerHTML = '';
  if (!currentPlaylist) return;
  const arr = library[currentPlaylist];
  for (let i=0;i<arr.length;i++){
    const it = arr[i];
    const row = document.createElement('div');
    row.className = 'song-row';
    row.onclick = () => playFromPlaylist(currentPlaylist, i);

    const title = document.createElement('div');
    title.className = 'song-title';
    title.textContent = it.name;

    const dur = document.createElement('div');
    dur.className = 'song-duration';
    dur.textContent = '--:--';

    // get duration by loading metadata (non-blocking)
    const tmp = document.createElement('audio');
    tmp.preload = 'metadata';
    tmp.src = it.url;
    tmp.onloadedmetadata = () => { dur.textContent = fmtTime(tmp.duration); tmp.remove(); };
    tmp.onerror = () => { dur.textContent = 'ERR'; tmp.remove(); };

    const dots = document.createElement('button');
    dots.className = 'dots-btn';
    dots.textContent = '⋮';
    dots.onclick = (ev) => { ev.stopPropagation(); addToQueueByItem(currentPlaylist, i); };

    row.appendChild(title);
    row.appendChild(dur);
    row.appendChild(dots);
    songsWrap.appendChild(row);
  }
}

// Playback
function playFromPlaylist(pl, index){
  const item = library[pl][index];
  if (!item) return;
  // toggle if same track playing
  if (currentPlaylist===pl && currentIndex===index && !audio.paused && audio.src){
    audio.pause(); playBtn.textContent='▶'; return;
  }
  currentPlaylist = pl; currentIndex = index;
  loadAndPlay(item);
}

async function loadAndPlay(item, startTime=0){
  try {
    audio.src = item.url;
    // set time after metadata loaded on some hosts
    audio.currentTime = startTime || 0;
    await audio.play();
    playBtn.textContent = '⏸';
    nowPlaying.textContent = `${item.name} • ${currentPlaylist}`;
  } catch (e) {
    alert('Playback error: cannot play this file (skipping).');
    console.error(e);
    skipNext();
  }
}

// controls
playBtn.addEventListener('click', ()=>{
  if (!audio.src){
    if (playlists.length) { selectPlaylist(playlists[0]); playFromPlaylist(playlists[0],0); }
    return;
  }
  if (audio.paused)

// ===========================================
// DATA STORAGE KEYS
// ===========================================
const PERMISSION_KEY = 'mboka_permission';
const MUSIC_LIBRARY_KEY = 'mboka_music_library';
const FAVOURITES_KEY = 'mboka_favourites';
const PLAYLISTS_KEY = 'mboka_playlists';
const PROFILE_KEY = 'mboka_profile';

// ===========================================
// GLOBAL VARIABLES
// ===========================================
let hasPermission = localStorage.getItem(PERMISSION_KEY) === 'granted';
let musicLibrary = [];
let favourites = [];
let playlists = [];
let profile = {};

// Audio player variables
const audio = document.getElementById('audioPlayer');
let currentSongIndex = -1;
let isPlaying = false;

// ===========================================
// INITIALIZATION
// ===========================================
document.addEventListener('DOMContentLoaded', function() {
    // Show permission card if first time
    if (!hasPermission) {
        document.getElementById('permission-card').style.display = 'block';
    } else {
        loadData();
        initializeApp();
    }
    
    // Setup navigation
    setupNavigation();
    
    // Setup file input
    document.getElementById('fileInput').addEventListener('change', handleFileSelect);
    
    // Setup audio events
    setupAudioEvents();
    
    // Profile dropdown toggle
    document.getElementById('profile-toggle').addEventListener('click', function(e) {
        e.stopPropagation();
        document.getElementById('profile-dropdown').classList.toggle('show');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function() {
        document.getElementById('profile-dropdown').classList.remove('show');
    });
    
    // Progress bar seek
    document.getElementById('progressBar').addEventListener('input', function(e) {
        if (audio.duration) {
            audio.currentTime = (e.target.value / 100) * audio.duration;
        }
    });
    
    // Volume control
    document.getElementById('volumeControl').addEventListener('input', function(e) {
        audio.volume = e.target.value;
        if (hasPermission) {
            profile.volume = e.target.value;
            saveProfile();
        }
    });
});

// ===========================================
// PERMISSION HANDLING
// ===========================================
function grantFileAccess() {
    hasPermission = true;
    localStorage.setItem(PERMISSION_KEY, 'granted');
    document.getElementById('permission-card').style.display = 'none';
    
    // Initialize with empty data
    musicLibrary = [];
    favourites = [];
    playlists = [];
    profile = {
        name: 'Music Listener',
        volume: 1,
        theme: '#3498db',
        picture: null
    };
    
    saveProfile();
    initializeApp();
    showToast('✅ File access granted');
}

function denyFileAccess() {
    document.getElementById('permission-card').style.display = 'none';
    showToast('❌ Permission denied. Cannot access files');
}

// ===========================================
// DATA LOADING
// ===========================================
function loadData() {
    musicLibrary = JSON.parse(localStorage.getItem(MUSIC_LIBRARY_KEY)) || [];
    favourites = JSON.parse(localStorage.getItem(FAVOURITES_KEY)) || [];
    playlists = JSON.parse(localStorage.getItem(PLAYLISTS_KEY)) || [];
    profile = JSON.parse(localStorage.getItem(PROFILE_KEY)) || {
        name: 'Music Listener',
        volume: 1,
        theme: '#3498db',
        picture: null
    };
}

function initializeApp() {
    // Load all displays
    displayMusicLibrary();
    displayFavourites();
    displayPlaylists();
    displayRecentSongs();
    updateStats();
    loadProfile();
    updateProfileDropdown();
}

// ===========================================
// NAVIGATION
// ===========================================
function setupNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    
    navBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const pageId = this.getAttribute('data-page');
            showPage(pageId);
        });
    });
}

function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    document.getElementById(pageId + '-page').classList.add('active');
    
    // Update navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-page') === pageId) {
            btn.classList.add('active');
        }
    });
    
    // Refresh content
    if (pageId === 'library') displayMusicLibrary();
    if (pageId === 'favourites') displayFavourites();
    if (pageId === 'playlists') displayPlaylists();
    if (pageId === 'recent') displayRecentSongs();
    if (pageId === 'profile') loadProfile();
    
    // Close dropdown
    document.getElementById('profile-dropdown').classList.remove('show');
}

// ===========================================
// FILE HANDLING
// ===========================================
function handleFileSelect(event) {
    if (!hasPermission) {
        showToast('❌ Please grant file access first');
        return;
    }
    
    const files = Array.from(event.target.files);
    
    files.forEach(file => {
        if (!file.type.startsWith('audio/')) {
            showToast(`❌ ${file.name} is not an audio file`);
            return;
        }
        
        const url = URL.createObjectURL(file);
        const audioElement = new Audio(url);
        
        audioElement.addEventListener('loadedmetadata', () => {
            const song = {
                id: Date.now() + Math.random(),
                name: file.name.replace(/\.[^/.]+$/, ""),
                artist: 'Unknown Artist',
                url: url,
                duration: audioElement.duration,
                size: file.size,
                type: file.type,
                added: new Date().toISOString(),
                playCount: 0
            };
            
            musicLibrary.unshift(song);
            saveLibrary();
            displayMusicLibrary();
            displayRecentSongs();
            updateStats();
            
            showToast(`✅ Added: ${song.name}`);
        });
    });
}

// ===========================================
// AUDIO PLAYER FUNCTIONS
// ===========================================
function setupAudioEvents() {
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', nextSong);
    audio.addEventListener('loadedmetadata', () => {
        document.getElementById('durationDisplay').textContent = formatTime(audio.duration);
    });
}

function playSong(index) {
    if (!hasPermission || index < 0 || index >= musicLibrary.length) return;
    
    currentSongIndex = index;
    const song = musicLibrary[index];
    
    audio.src = song.url;
    audio.volume = profile.volume;
    audio.play();
    
    isPlaying = true;
    document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-pause"></i>';
    document.getElementById('currentSongTitle').textContent = song.name;
    document.getElementById('currentSongArtist').textContent = song.artist;
    document.getElementById('nowPlayingBar').style.display = 'block';
    
    song.playCount = (song.playCount || 0) + 1;
    saveLibrary();
    
    highlightPlayingSong();
}

function playSongById(songId) {
    const index = musicLibrary.findIndex(s => s.id === songId);
    if (index !== -1) playSong(index);
}

function playPause() {
    if (!hasPermission) {
        showToast('❌ Please grant file access first');
        return;
    }
    
    if (musicLibrary.length === 0) {
        showToast('Add some music first!');
        return;
    }
    
    if (currentSongIndex === -1) {
        playSong(0);
        return;
    }
    
    if (isPlaying) {
        audio.pause();
        isPlaying = false;
        document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-play"></i>';
    } else {
        audio.play();
        isPlaying = true;
        document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-pause"></i>';
    }
}

function nextSong() {
    if (musicLibrary.length === 0) return;
    
    let nextIndex = currentSongIndex + 1;
    if (nextIndex >= musicLibrary.length) nextIndex = 0;
    
    playSong(nextIndex);
}

function previousSong() {
    if (musicLibrary.length === 0) return;
    
    let prevIndex = currentSongIndex - 1;
    if (prevIndex < 0) prevIndex = musicLibrary.length - 1;
    
    playSong(prevIndex);
}

function updateProgress() {
    const progress = (audio.currentTime / audio.duration) * 100 || 0;
    document.getElementById('progressBar').value = progress;
    document.getElementById('currentTimeDisplay').textContent = formatTime(audio.currentTime);
}

function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ===========================================
// FAVOURITE FUNCTIONS
// ===========================================
function toggleFavourite(songId) {
    const index = favourites.findIndex(f => f.id === songId);
    
    if (index === -1) {
        const song = musicLibrary.find(s => s.id === songId);
        if (song) {
            favourites.push(song);
            showToast('❤️ Added to favourites');
        }
    } else {
        favourites.splice(index, 1);
        showToast('💔 Removed from favourites');
    }
    
    saveFavourites();
    displayMusicLibrary();
    displayFavourites();
    updateStats();
}

function isFavourite(songId) {
    return favourites.some(f => f.id === songId);
}

// ===========================================
// DISPLAY FUNCTIONS
// ===========================================
function displayMusicLibrary() {
    if (!hasPermission) return;
    
    const songsList = document.getElementById('songsList');
    const searchInput = document.getElementById('searchInput')?.value.toLowerCase() || '';
    
    let songsToShow = musicLibrary;
    
    if (searchInput) {
        songsToShow = musicLibrary.filter(song => 
            song.name.toLowerCase().includes(searchInput) ||
            song.artist.toLowerCase().includes(searchInput)
        );
    }
    
    if (songsToShow.length === 0) {
        songsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-headphones"></i>
                <h3>No songs found</h3>
                <p>${musicLibrary.length === 0 ? 'Add some music files' : 'Try a different search'}</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    songsToShow.forEach((song) => {
        const isPlaying = (currentSongIndex !== -1 && musicLibrary[currentSongIndex]?.id === song.id);
        const isFav = isFavourite(song.id);
        
        html += `
            <div class="song-item ${isPlaying ? 'playing' : ''} ${isFav ? 'favourite' : ''}" onclick="playSongById(${song.id})">
                <div class="song-artwork">
                    <i class="fas fa-music"></i>
                </div>
                <div class="song-info">
                    <div class="song-title">${song.name}</div>
                    <div class="song-artist">${song.artist}</div>
                </div>
                <div class="song-duration">${formatTime(song.duration)}</div>
                <div class="song-actions" onclick="event.stopPropagation()">
                    <button onclick="toggleFavourite(${song.id})" class="favourite-btn ${isFav ? 'active' : ''}">
                        <i class="fas fa-heart"></i>
                    </button>
                    <button onclick="addToPlaylist(${song.id})" class="secondary">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button onclick="deleteSong(${song.id})" class="danger">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    songsList.innerHTML = html;
}

function displayFavourites() {
    if (!hasPermission) return;
    
    const favouritesList = document.getElementById('favouritesList');
    
    if (favourites.length === 0) {
        favouritesList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-heart"></i>
                <h3>No favourite songs</h3>
                <p>Click the heart icon on any song to add it to favourites</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    favourites.forEach((song) => {
        html += `
            <div class="song-item favourite" onclick="playSongById(${song.id})">
                <div class="song-artwork">
                    <i class="fas fa-music"></i>
                </div>
                <div class="song-info">
                    <div class="song-title">${song.name}</div>
                    <div class="song-artist">${song.artist}</div>
                </div>
                <div class="song-duration">${formatTime(song.duration)}</div>
                <div class="song-actions" onclick="event.stopPropagation()">
                    <button onclick="toggleFavourite(${song.id})" class="favourite-btn active">
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    favouritesList.innerHTML = html;
}

function displayRecentSongs() {
    if (!hasPermission) return;
    
    const recentSongs = [...musicLibrary].sort((a, b) => 
        new Date(b.added) - new Date(a.added)
    ).slice(0, 10);
    
    const recentList = document.getElementById('recentSongsList');
    
    if (recentSongs.length === 0) {
        recentList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clock"></i>
                <h3>No recently added songs</h3>
                <p>Add music to see them here</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    recentSongs.forEach((song) => {
        html += `
            <div class="song-item" onclick="playSongById(${song.id})">
                <div class="song-artwork">
                    <i class="fas fa-music"></i>
                </div>
                <div class="song-info">
                    <div class="song-title">${song.name}</div>
                    <div class="song-artist">${song.artist}</div>
                </div>
                <div class="song-duration">${formatTime(song.duration)}</div>
            </div>
        `;
    });
    
    recentList.innerHTML = html;
}

function displayPlaylists() {
    if (!hasPermission) return;
    
    const playlistsGrid = document.getElementById('playlistsGrid');
    const emptyPlaylists = document.getElementById('emptyPlaylists');
    
    if (playlists.length === 0) {
        playlistsGrid.innerHTML = '';
        emptyPlaylists.style.display = 'block';
        return;
    }
    
    emptyPlaylists.style.display = 'none';
    
    let html = '';
    playlists.forEach((playlist, index) => {
        html += `
            <div class="playlist-card" onclick="openPlaylist(${index})">
                <div class="playlist-icon">
                    <i class="fas fa-list"></i>
                </div>
                <div class="playlist-name">${playlist.name}</div>
                <div class="playlist-count">${playlist.songs.length} songs</div>
            </div>
        `;
    });
    
    playlistsGrid.innerHTML = html;
}

function searchMusic() {
    displayMusicLibrary();
}

function highlightPlayingSong() {
    displayMusicLibrary();
}

// ===========================================
// PLAYLIST FUNCTIONS
// ===========================================
function createPlaylist() {
    if (!hasPermission) {
        showToast('❌ Please grant file access first');
        return;
    }
    
    const name = prompt('Enter playlist name:');
    if (!name) return;
    
    playlists.push({
        id: Date.now(),
        name: name,
        songs: [],
        created: new Date().toISOString()
    });
    
    savePlaylists();
    displayPlaylists();
    updateStats();
    showToast(`✅ Playlist "${name}" created`);
}

function addToPlaylist(songId) {
    if (playlists.length === 0) {
        if (confirm('No playlists yet. Create one?')) {
            createPlaylist();
        }
        return;
    }
    
    const song = musicLibrary.find(s => s.id === songId);
    if (!song) return;
    
    const playlistNames = playlists.map((p, i) => `${i + 1}. ${p.name}`).join('\n');
    const choice = prompt(`Select playlist number:\n${playlistNames}`);
    
    if (choice && !isNaN(choice) && choice > 0 && choice <= playlists.length) {
        const playlistIndex = choice - 1;
        
        if (!playlists[playlistIndex].songs.some(s => s.id === song.id)) {
            playlists[playlistIndex].songs.push(song);
            savePlaylists();
            showToast(`✅ Added to ${playlists[playlistIndex].name}`);
        } else {
            showToast('Song already in playlist');
        }
    }
}

function openPlaylist(playlistIndex) {
    const playlist = playlists[playlistIndex];
    const songList = playlist.songs;
    
    if (songList.length === 0) {
        showToast('Playlist is empty');
        return;
    }
    
    // Show playlist songs in library view
    showPage('library');
    displayMusicLibrary(songList);
}

// ===========================================
// PROFILE FUNCTIONS
// ===========================================
function loadProfile() {
    if (!hasPermission) return;
    
    document.getElementById('displayName').value = profile.name;
    document.getElementById('defaultVolume').value = profile.volume;
    document.getElementById('volumeControl').value = profile.volume;
    document.getElementById('themeColor').value = profile.theme;
    
    audio.volume = profile.volume;
    document.getElementById('profileName').textContent = profile.name;
}

function saveProfile() {
    if (!hasPermission) return;
    
    profile.name = document.getElementById('displayName').value;
    profile.volume = parseFloat(document.getElementById('defaultVolume').value);
    profile.theme = document.getElementById('themeColor').value;
    
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    
    updateProfileDropdown();
    document.getElementById('profileName').textContent = profile.name;
    showToast('✅ Settings saved');
}

function updateProfilePicture() {
    if (!hasPermission) {
        showToast('❌ Please grant file access first');
        return;
    }
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(event) {
            profile.picture = event.target.result;
            saveProfile();
            updateProfileDropdown();
            showToast('✅ Profile picture updated');
        };
        reader.readAsDataURL(file);
    };
    
    input.click();
}

function updateProfileDropdown() {
    document.getElementById('dropdown-username').textContent = profile.name || 'Music Listener';
    
    if (profile.picture) {
        document.getElementById('profile-icon').innerHTML = 
            `<img src="${profile.picture}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover;">`;
        document.getElementById('dropdown-profile-pic').innerHTML = 
            `<img src="${profile.picture}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover;">`;
    } else {
        document.getElementById('profile-icon').innerHTML = '<i class="fas fa-user"></i>';
        document.getElementById('dropdown-profile-pic').innerHTML = '<i class="fas fa-user"></i>';
    }
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        showToast('👋 Logged out');
        // Just refresh UI
        showPage('library');
    }
}

// ===========================================
// STORAGE FUNCTIONS
// ===========================================
function saveLibrary() {
    localStorage.setItem(MUSIC_LIBRARY_KEY, JSON.stringify(musicLibrary));
    updateStats();
}

function saveFavourites() {
    localStorage.setItem(FAVOURITES_KEY, JSON.stringify(favourites));
}

function savePlaylists() {
    localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
}

function deleteSong(songId) {
    if (!hasPermission) return;
    
    if (confirm('Delete this song?')) {
        const songIndex = musicLibrary.findIndex(s => s.id === songId);
        if (songIndex !== -1) {
            URL.revokeObjectURL(musicLibrary[songIndex].url);
            musicLibrary.splice(songIndex, 1);
            
            const favIndex = favourites.findIndex(f => f.id === songId);
            if (favIndex !== -1) {
                favourites.splice(favIndex, 1);
                saveFavourites();
            }
            
            saveLibrary();
            displayMusicLibrary();
            displayFavourites();
            
            if (currentSongIndex === songIndex) {
                audio.pause();
                currentSongIndex = -1;
                isPlaying = false;
                document.getElementById('nowPlayingBar').style.display = 'none';
            }
            
            updateStats();
            showToast('✅ Song deleted');
        }
    }
}

function clearAllData() {
    if (!hasPermission) return;
    
    if (confirm('Clear entire music library? This cannot be undone.')) {
        musicLibrary.forEach(song => URL.revokeObjectURL(song.url));
        
        musicLibrary = [];
        favourites = [];
        playlists = [];
        
        localStorage.setItem(MUSIC_LIBRARY_KEY, JSON.stringify(musicLibrary));
        localStorage.setItem(FAVOURITES_KEY, JSON.stringify(favourites));
        localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
        
        displayMusicLibrary();
        displayFavourites();
        displayPlaylists();
        displayRecentSongs();
        updateStats();
        
        audio.pause();
        document.getElementById('nowPlayingBar').style.display = 'none';
        
        showToast('✅ Library cleared');
    }
}

function updateStats() {
    if (!hasPermission) return;
    
    const totalSize = musicLibrary.reduce((sum, song) => sum + (song.size || 0), 0);
    const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
    
    const totalMinutes = musicLibrary.reduce((sum, song) => sum + (song.duration || 0), 0) / 60;
    
    document.getElementById('totalSongs').textContent = musicLibrary.length;
    document.getElementById('totalFavourites').textContent = favourites.length;
    document.getElementById('totalPlaylists').textContent = playlists.length;
    document.getElementById('storageUsed').textContent = totalSizeMB + ' MB';
    
    document.getElementById('totalSongsStat').textContent = musicLibrary.length;
    document.getElementById('totalFavouritesStat').textContent = favourites.length;
    document.getElementById('totalStorage').textContent = totalSizeMB + ' MB';
    document.getElementById('totalPlaytime').textContent = Math.round(totalMinutes) + ' min';
    
    const percentUsed = Math.min((totalSize / (50 * 1024 * 1024)) * 100, 100);
    document.getElementById('storageBar').style.width = percentUsed + '%';
}

// ===========================================
// NOTIFICATION
// ===========================================
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
      }

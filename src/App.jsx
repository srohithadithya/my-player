import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Home, Compass, Library, Download, ArrowDownToLine,
  Cloud, Search, Bell, Settings, Play, Pause,
  SkipBack, SkipForward, Volume2, Shuffle, Repeat,
  Heart, Plus, X, Music, Car, AlertTriangle, PlayCircle
} from 'lucide-react';
import './App.css';

// Mock Data
const sections = ['All', 'Telugu', 'Hindi', 'English', 'Tamil', 'Malayalam', 'Directors', 'Top Plays', 'Sensations'];

const initialMockSongs = [
  { id: 1, title: 'Tum Hi Ho', artist: 'Arijit Singh', cover: 'https://images.unsplash.com/photo-1493225457124-a1a2a5f5cb39?q=80&w=200&auto=format&fit=crop', lang: 'Hindi', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 2, title: 'Butta Bomma', artist: 'Armaan Malik', cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=200&auto=format&fit=crop', lang: 'Telugu', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: 3, title: 'Shape of You', artist: 'Ed Sheeran', cover: 'https://images.unsplash.com/photo-1458560871784-56d23406c091?q=80&w=200&auto=format&fit=crop', lang: 'English' },
  { id: 4, title: 'Enjoy Enjaami', artist: 'Dhee, Arivu', cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=200&auto=format&fit=crop', lang: 'Tamil' },
  { id: 5, title: 'Darshana', artist: 'Hesham Abdul Wahab', cover: 'https://images.unsplash.com/photo-1621360841013-c76831f12560?q=80&w=200&auto=format&fit=crop', lang: 'Malayalam' },
  { id: 6, title: 'Naatu Naatu', artist: 'Rahul Sipligunj', cover: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=200&auto=format&fit=crop', lang: 'Telugu' },
  // Adding intentional duplicate
  { id: 7, title: 'Shape of You', artist: 'Ed Sheeran', cover: 'https://images.unsplash.com/photo-1458560871784-56d23406c091?q=80&w=200&auto=format&fit=crop', lang: 'English' },
];

const mockProfiles = [
  { id: 1, name: 'Rohit', avatar: 'R' },
  { id: 2, name: 'Guest', avatar: 'G' },
];

function App() {
  const [activeTab, setActiveTab] = useState('Home');
  const [activeSection, setActiveSection] = useState('All');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSong, setCurrentSong] = useState(initialMockSongs[0]);

  // Modals state
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [cloudModalOpen, setCloudModalOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [currentProfile, setCurrentProfile] = useState(mockProfiles[0]);

  // New Features State
  const [drivingMode, setDrivingMode] = useState(false);
  const [listeningTime, setListeningTime] = useState(0);
  const [healthWarningOpen, setHealthWarningOpen] = useState(false);
  const [songs, setSongs] = useState([]);

  // Audio & Network State
  const audioRef = useRef(null);
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');

  // Merge Duplicates
  useEffect(() => {
    const mergeDuplicates = (playlist) => {
      const seen = new Set();
      return playlist.filter(song => {
        const key = `${song.title.toLowerCase()}-${song.artist.toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };
    setSongs(mergeDuplicates(initialMockSongs));
  }, []);

  // Health Hazard Tracker (Simulated: e.g. 7200 seconds = 2 hours)
  useEffect(() => {
    let timer;
    if (isPlaying) {
      timer = setInterval(() => {
        setListeningTime(prev => {
          const newTime = prev + 1;
          // For demonstration, trigger warning after 7200 seconds (2 hours)
          // We will mock it here with 7200 realistically
          if (newTime === 7200) {
            setHealthWarningOpen(true);
          }
          return newTime;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  // Filtering data
  const filteredSongs = activeSection === 'All'
    ? songs
    : songs.filter(s => s.lang === activeSection || activeSection === 'Top Plays');

  const handlePlay = (song) => {
    setCurrentSong(song);
    setIsPlaying(true);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    const currentIndex = songs.findIndex(s => s.id === currentSong.id);
    if(isShuffle) {
       setCurrentSong(songs[Math.floor(Math.random() * songs.length)]);
    } else {
       setCurrentSong(songs[(currentIndex + 1) % songs.length] || songs[0]);
    }
  };

  const handlePrev = () => {
    const currentIndex = songs.findIndex(s => s.id === currentSong.id);
    setCurrentSong(songs[(currentIndex - 1 + songs.length) % songs.length] || songs[0]);
  };

  const handleTimeUpdate = () => {
    setProgress(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    setDuration(audioRef.current.duration);
    if(audioRef.current) audioRef.current.volume = volume;
  };

  const formatTime = (time) => {
    if (!time || isNaN(time)) return "00:00";
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.play().catch(e => console.log('Audio playback error:', e));
      else audioRef.current.pause();
    }
  }, [isPlaying, currentSong]);

  const handleAudioEnded = () => {
    if(isRepeat) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    } else {
      handleNext();
    }
  };

  const handleImportPlaylist = async () => {
    if (!importUrl) return;
    setIsImporting(true);
    try {
      const response = await axios.post('https://auraplay.onrender.com/api/playlist/import', { url: importUrl });
      if (response.data && response.data.tracks) {
        // Merge fetched data onto existing UI Array natively
        setSongs(prev => [...response.data.tracks, ...prev]);
        setExportModalOpen(false);
        setImportUrl('');
        alert(response.data.message);
      }
    } catch (err) {
      alert('Error fetching playlist from backend API.');
      console.error(err);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="app-container">
      <audio 
         ref={audioRef} 
         src={currentSong?.audioUrl || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3'} 
         onEnded={handleAudioEnded} 
         onTimeUpdate={handleTimeUpdate}
         onLoadedMetadata={handleLoadedMetadata}
      />

      {/* SIDEBAR */}
      <aside className="sidebar glass">
        <div className="brand">
          <Music className="brand-icon" size={32} />
          <span className="text-gradient">AuraPlay</span>
        </div>

        <div className="nav-menu">
          <div className="nav-section-title">Menu</div>
          <button className={`nav-item ${activeTab === 'Home' ? 'active' : ''}`} onClick={() => setActiveTab('Home')}>
            <Home size={20} /> Home
          </button>
          <button className={`nav-item ${activeTab === 'Explore' ? 'active' : ''}`} onClick={() => setActiveTab('Explore')}>
            <Compass size={20} /> Explore
          </button>
          <button className={`nav-item ${activeTab === 'Library' ? 'active' : ''}`} onClick={() => setActiveTab('Library')}>
            <Library size={20} /> Library
          </button>

          <div className="nav-section-title">Features</div>
          <button className="nav-item" onClick={() => setExportModalOpen(true)}>
            <Download size={20} /> Import Playlists
          </button>
          <button className="nav-item" onClick={() => setCloudModalOpen(true)}>
            <Cloud size={20} /> Cloud Sync
          </button>
          <button className="nav-item">
            <ArrowDownToLine size={20} /> Downloads
          </button>
        </div>

        <div
          className="profile-selector glass"
          onClick={() => setProfileOpen(true)}
        >
          <div className="profile-avatar">{currentProfile.avatar}</div>
          <div style={{ flex: 1, textAlign: 'left', fontSize: '14px', fontWeight: 600 }}>{currentProfile.name}</div>
          <div className="online-indicator"></div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-wrapper">

        <header className="topbar glass-panel">
          <div className="search-bar">
            <Search size={18} color="var(--text-muted)" />
            <input type="text" placeholder="Search for songs, artists, movies..." />
          </div>
          <div className="top-actions">
            <button className="action-btn" onClick={() => alert('No new notifications!')}><Bell size={18} /></button>
            <button className="action-btn" onClick={() => alert('Settings Menu Loaded.')}><Settings size={18} /></button>
          </div>
        </header>

        <div className="main-content">
          {activeTab === 'Explore' && (
            <div className="hero-banner" style={{background: 'var(--primary-glow)'}}>
              <div className="hero-title">Global Top 50</div>
              <p>Discover the most streamed tracks in the world.</p>
            </div>
          )}

          {activeTab === 'Library' && (
            <div className="section-title">
              <span>Your Curated Library</span>
            </div>
          )}

          {activeTab === 'Home' && (
            <>
          {/* Categories / Segregation Header */}
          <div className="categories">
            {sections.map(sec => (
              <button
                key={sec}
                className={`category-pill ${activeSection === sec ? 'active' : ''}`}
                onClick={() => setActiveSection(sec)}
              >
                {sec}
              </button>
            ))}
          </div>

          <div className="hero-banner">
            <div className="hero-subtitle">Trending Now</div>
            <div className="hero-title">Experience The<br />Purest Sound.</div>
            <button className="hero-btn">Listen Offline</button>
          </div>

          <div className="section-title">
            <span>{activeSection} Music</span>
            <span className="see-all">See All</span>
          </div>

          <div className="grid">
            {filteredSongs.map((song) => (
              <div className="card glass" key={song.id} onClick={() => handlePlay(song)}>
                <div className="card-img-wrapper">
                  <img src={song.cover} alt="Cover" className="card-img" />
                  <div className="card-play-btn">
                    <Play fill="white" size={20} />
                  </div>
                </div>
                <div className="card-title">{song.title}</div>
                <div className="card-subtitle">{song.artist} • {song.lang}</div>
              </div>
            ))}
          </div>

          <div className="section-title">
            <span>Top Directors & Singers</span>
          </div>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
            {['A.R. Rahman', 'Anirudh', 'Thaman S', 'Devi Sri Prasad', 'Shreya Ghoshal'].map((artist, i) => (
              <div className="card glass" key={i} style={{ textAlign: 'center', borderRadius: '24px' }}>
                <div style={{ width: '100px', height: '100px', borderRadius: '50%', margin: '0 auto 16px', background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Music size={40} opacity={0.5} color="var(--primary)" />
                </div>
                <div className="card-title">{artist}</div>
              </div>
            ))}
          </div>

          </>
          )}

        </div>
      </main>

      {/* PLAYER BAR */}
      <div className="player-bar glass-panel">
        <div className="player-left">
          <img
            src={currentSong.cover}
            alt="Now Playing"
            className={`now-playing-img ${isPlaying ? 'playing' : ''}`}
          />
          <div className="now-playing-info">
            <div className="song-title">{currentSong.title}</div>
            <div className="song-artist">{currentSong.artist}</div>
          </div>
          <button className="control-btn" style={{ marginLeft: '8px' }}><Heart size={20} /></button>
        </div>

        <div className="player-center">
          <div className="player-controls">
            <button className="control-btn" style={{color: isShuffle ? 'var(--primary)' : 'white'}} onClick={() => setIsShuffle(!isShuffle)}><Shuffle size={18} /></button>
            <button className="control-btn" onClick={handlePrev}><SkipBack size={24} /></button>
            <button
              className="play-pause-btn"
              style={{ background: drivingMode ? 'var(--secondary)' : 'var(--primary)', color: 'white' }}
              onClick={togglePlayPause}
            >
              {isPlaying ? <Pause fill="white" size={20} /> : <Play fill="white" size={20} />}
            </button>
            <button className="control-btn" onClick={handleNext}><SkipForward size={24} /></button>
            <button className="control-btn" style={{color: isRepeat ? 'var(--primary)' : 'white'}} onClick={() => setIsRepeat(!isRepeat)}><Repeat size={18} /></button>
          </div>
          <div className="progress-container">
            <span>{formatTime(progress)}</span>
            <div className="progress-bar-bg" style={{position: 'relative', display: 'flex', alignItems: 'center'}}>
              <input 
                type="range" 
                min="0" 
                max={duration || 100} 
                value={progress}
                onChange={(e) => {
                  audioRef.current.currentTime = e.target.value;
                  setProgress(e.target.value);
                }}
                style={{position: 'absolute', width: '100%', opacity: 0, cursor: 'pointer', zIndex: 5, height: '10px'}}
              />
              <div 
                className="progress-bar-fill" 
                style={{ 
                  background: drivingMode ? 'var(--secondary)' : 'var(--primary)', 
                  width: `${(progress / (duration || 1)) * 100}%` 
                }}></div>
            </div>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="player-right">
          <button
            className="control-btn"
            onClick={() => setDrivingMode(!drivingMode)}
            style={{ color: drivingMode ? 'var(--secondary)' : 'var(--text-muted)' }}
            title="Driving Mode"
          >
            <Car size={20} />
          </button>
          <button className="control-btn"><Volume2 size={20} /></button>
          <div className="volume-bar" style={{ opacity: drivingMode ? 0.5 : 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input 
              type="range" 
              min="0" max="1" step="0.01" 
              value={volume} 
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setVolume(v);
                if(audioRef.current) audioRef.current.volume = v;
              }}
              style={{position: 'absolute', width: '100%', opacity: 0, cursor: 'pointer', zIndex: 5, height: '10px'}}
            />
            <div className="volume-fill" style={{ width: drivingMode ? '25%' : `${volume * 100}%`, background: drivingMode ? 'var(--secondary)' : 'white' }}></div>
          </div>
        </div>
      </div>

      {/* HEALTH HAZARD MODAL */}
      <div className={`modal-overlay ${healthWarningOpen ? 'active' : ''}`}>
        <div className="modal-content glass" style={{ border: '1px solid var(--secondary)', boxShadow: '0 0 30px rgba(255, 94, 98, 0.2)' }}>
          <div className="modal-header">
            <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--secondary)' }}>
              <AlertTriangle size={24} />
              Health Warning
            </div>
            <button onClick={() => setHealthWarningOpen(false)}><X size={24} /></button>
          </div>
          <p style={{ marginBottom: '20px', color: 'var(--text-main)', lineHeight: '1.6' }}>
            You have been continually listening to audio for several hours. Prolonged exposure to continuous sound can cause fatigue and hearing hazards.
            <br /><br />
            <strong>We recommend taking a short break.</strong>
          </p>
          <button className="hero-btn" style={{ width: '100%', background: 'var(--secondary)', boxShadow: 'none' }} onClick={() => setHealthWarningOpen(false)}>
            I understand, dismiss
          </button>
        </div>
      </div>

      {/* EXPORT MODAL */}
      <div className={`modal-overlay ${exportModalOpen ? 'active' : ''}`}>
        <div className="modal-content glass">
          <div className="modal-header">
            <div className="modal-title">Import Playlists</div>
            <button onClick={() => setExportModalOpen(false)}><X size={24} /></button>
          </div>
          <p style={{ marginBottom: '20px', color: 'var(--text-muted)' }}>
            No login required! Just paste a link. We will automatically remove duplicates from your playlists.
          </p>
          <button className="integration-btn">
            <div style={{ background: '#1DB954', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <Music size={16} color="white" />
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>Import from Spotify</div>
          </button>
          <button className="integration-btn">
            <div style={{ background: '#FF0000', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <PlayCircle size={16} color="white" />
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>Import from YouTube</div>
          </button>
          <button className="integration-btn">
            <div style={{ background: '#2BC5B4', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <Music size={16} color="white" />
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>Import from JioSaavn</div>
          </button>

          <div style={{ marginTop: '20px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>OR PASTE LINK</div>
            <div className="search-bar" style={{ width: '100%', background: 'rgba(0,0,0,0.3)' }}>
              <input
                type="text"
                placeholder="https://spotify.com/playlist..."
                value={importUrl}
                onChange={e => setImportUrl(e.target.value)}
              />
              <button
                onClick={handleImportPlaylist}
                disabled={isImporting}
                style={{ color: 'var(--primary)', fontWeight: 'bold' }}
              >
                {isImporting ? 'Syncing...' : 'Fetch'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CLOUD CONNECT MODAL */}
      <div className={`modal-overlay ${cloudModalOpen ? 'active' : ''}`}>
        <div className="modal-content glass">
          <div className="modal-header">
            <div className="modal-title">Cloud Sync for Downloads</div>
            <button onClick={() => setCloudModalOpen(false)}><X size={24} /></button>
          </div>
          <p style={{ marginBottom: '20px', color: 'var(--text-muted)' }}>
            Save your offline music directly to your cloud storage.
          </p>
          <button className="integration-btn">
            <div style={{ background: '#4285F4', width: 32, height: 32, borderRadius: 8 }} className="integration-icon"></div>
            <div style={{ flex: 1, textAlign: 'left' }}>Connect Google One</div>
          </button>
          <button className="integration-btn">
            <div style={{ background: '#0078D4', width: 32, height: 32, borderRadius: 8 }} className="integration-icon"></div>
            <div style={{ flex: 1, textAlign: 'left' }}>Connect OneDrive</div>
          </button>
        </div>
      </div>

      {/* PROFILES MODAL */}
      <div className={`modal-overlay ${profileOpen ? 'active' : ''}`}>
        <div className="modal-content glass" style={{ width: '300px' }}>
          <div className="modal-header">
            <div className="modal-title">Select Profile</div>
            <button onClick={() => setProfileOpen(false)}><X size={24} /></button>
          </div>
          {mockProfiles.map(p => (
            <button
              key={p.id}
              className="integration-btn"
              style={{ background: p.id === currentProfile.id ? 'var(--primary-glow)' : '' }}
              onClick={() => { setCurrentProfile(p); setProfileOpen(false); }}
            >
              <div className="profile-avatar">{p.avatar}</div>
              <div style={{ flex: 1, textAlign: 'left' }}>{p.name}</div>
            </button>
          ))}
          <div style={{display: 'flex', gap: '8px', marginTop: '16px'}}>
            <input 
               type="text" 
               placeholder="New profile name..." 
               value={newProfileName}
               onChange={e => setNewProfileName(e.target.value)}
               style={{flex: 1, background: 'rgba(0,0,0,0.3)', border: 'none', padding: '8px', color: 'white', borderRadius: '8px'}}
            />
            <button 
              className="integration-btn" 
              style={{justifyContent: 'center', color: 'var(--primary)'}}
              onClick={() => {
                if(newProfileName.trim() !== '') {
                  mockProfiles.push({ id: Date.now(), name: newProfileName, avatar: newProfileName[0].toUpperCase() });
                  setNewProfileName('');
                  setProfileOpen(false);
                }
              }}
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}

export default App;

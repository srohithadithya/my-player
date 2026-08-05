import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import {
  Home, Compass, Library, Download, ArrowDownToLine,
  Cloud, Search, Bell, Settings, Play, Pause,
  SkipBack, SkipForward, Volume2, Shuffle, Repeat,
  Heart, Plus, X, Music, Car, AlertTriangle, PlayCircle,
  ChevronLeft, Disc3, Users, ListMusic, Loader2
} from 'lucide-react';
import './App.css';

const API_BASE = 'https://auraplay.onrender.com';

const sections = ['All', 'Telugu', 'Hindi', 'English', 'Tamil', 'Malayalam'];

const loadingSong = { 
  id: 'loading', title: 'AuraPlay', artist: 'Search for music to begin', 
  cover: 'https://images.unsplash.com/photo-1614113489855-66422ad300a4?w=200', 
  lang: 'Network', audioUrl: '' 
};

const mockProfiles = [
  { id: 1, name: 'Rohit', avatar: 'R' },
  { id: 2, name: 'Guest', avatar: 'G' },
];

function App() {
  const [activeTab, setActiveTab] = useState('Home');
  const [activeSection, setActiveSection] = useState('All');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSong, setCurrentSong] = useState(loadingSong);

  // Modals
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [cloudModalOpen, setCloudModalOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [currentProfile, setCurrentProfile] = useState(mockProfiles[0]);

  // Features
  const [drivingMode, setDrivingMode] = useState(false);
  const [listeningTime, setListeningTime] = useState(0);
  const [healthWarningOpen, setHealthWarningOpen] = useState(false);
  const [healthWarningDisabled, setHealthWarningDisabled] = useState(false);
  const [songs, setSongs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState('songs');
  const [mlRecommendations, setMlRecommendations] = useState([]);
  const [history, setHistory] = useState([]);
  const [downloads, setDownloads] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Detail View State — for albums, artists, playlists
  const [detailView, setDetailView] = useState(null); // { type, id, title, cover, songs }
  const [detailLoading, setDetailLoading] = useState(false);

  // Audio & Network
  const audioRef = useRef(null);
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');

  // Queue for playback
  const [queue, setQueue] = useState([]);

  const mergeDuplicates = (playlist) => {
    const seen = new Set();
    return playlist.filter(song => {
      const normalize = str => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const key = `${normalize(song.title)}-${normalize(song.artist)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  // ============================
  // BOOT: Fetch trending songs
  // ============================
  useEffect(() => {
    const boot = async () => {
      setIsLoading(true);
      try {
        const res = await axios.get(`${API_BASE}/api/search/songs?q=trending`);
        if (res.data && res.data.length > 0) {
          setSongs(res.data);
          setQueue(res.data);
          setCurrentSong(res.data[0]);
        }
      } catch (e) {
        console.log('Boot fetch failed, trying fallback...');
        try {
          const fallback = await axios.get(`${API_BASE}/api/search/songs?q=arijit singh`);
          if (fallback.data && fallback.data.length > 0) {
            setSongs(fallback.data);
            setQueue(fallback.data);
            setCurrentSong(fallback.data[0]);
          }
        } catch (e2) { console.log('Fallback also failed.'); }
      } finally {
        setIsLoading(false);
      }
    };
    boot();

    const savedHistory = JSON.parse(localStorage.getItem('auraplay_history')) || [];
    const savedDownloads = JSON.parse(localStorage.getItem('auraplay_downloads')) || [];
    setHistory(savedHistory);
    setDownloads(savedDownloads);
    if (savedHistory.length > 0) fetchRecommendations(savedHistory);
  }, []);

  // ============================
  // ML Recommendations
  // ============================
  const fetchRecommendations = async (hist) => {
    try {
      const res = await axios.post(`${API_BASE}/api/recommend`, { history: hist });
      if (res.data && res.data.length > 0) setMlRecommendations(res.data);
    } catch (e) { console.error("ML Engine Error:", e); }
  };

  // ============================
  // Search Engine (debounced)
  // ============================
  useEffect(() => {
    if (!searchQuery.trim()) {
      // If query cleared, reload trending
      if (songs.length === 0) {
        axios.get(`${API_BASE}/api/search/songs?q=trending`).then(res => {
          if (res.data && res.data.length > 0) { setSongs(res.data); setQueue(res.data); }
        }).catch(() => {});
      }
      return;
    }
    const delay = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await axios.get(`${API_BASE}/api/search/${searchCategory}?q=${encodeURIComponent(searchQuery)}`);
        if (res.data) {
          setSongs(res.data);
          if (searchCategory === 'songs') setQueue(res.data);
        }
      } catch (e) { console.error("Search failed"); }
      finally { setIsSearching(false); }
    }, 500);
    return () => clearTimeout(delay);
  }, [searchQuery, searchCategory]);

  // ============================
  // Album / Artist / Playlist Detail Fetcher
  // ============================
  const fetchDetail = async (item) => {
    setDetailLoading(true);
    setDetailView({ type: item.type, id: item.id, title: item.title, cover: item.cover, artist: item.artist, songs: [], meta: item });
    try {
      let detailData;
      if (item.type === 'album') {
        const res = await axios.get(`${API_BASE}/api/albums/${item.id}`);
        detailData = res.data;
      } else if (item.type === 'artist') {
        const res = await axios.get(`${API_BASE}/api/artists/${item.id}`);
        detailData = res.data;
      } else {
        // Fallback for playlists — search songs by title
        const res = await axios.get(`${API_BASE}/api/search/songs?q=${encodeURIComponent(item.title)}`);
        detailData = { songs: res.data || [] };
      }
      if (detailData) {
        setDetailView(prev => ({
          ...prev, 
          songs: detailData.songs || [],
          title: detailData.title || prev.title,
          cover: detailData.cover || prev.cover,
          artist: detailData.artist || prev.artist,
          meta: { ...prev.meta, ...detailData }
        }));
        if (detailData.songs && detailData.songs.length > 0) {
          setQueue(detailData.songs);
        }
      }
    } catch (e) {
      console.error("Detail fetch error:", e);
      // Fallback: search by name
      try {
        const fallback = await axios.get(`${API_BASE}/api/search/songs?q=${encodeURIComponent(item.title)}`);
        if (fallback.data && fallback.data.length > 0) {
          setDetailView(prev => ({ ...prev, songs: fallback.data }));
          setQueue(fallback.data);
        }
      } catch (e2) { console.error("Fallback also failed"); }
    }
    finally { setDetailLoading(false); }
  };

  // ============================
  // Health Hazard Tracker
  // ============================
  useEffect(() => {
    let timer;
    if (isPlaying && !healthWarningDisabled) {
      timer = setInterval(() => {
        setListeningTime(prev => {
          const newTime = prev + 1;
          if (newTime === 7200) setHealthWarningOpen(true);
          return newTime;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlaying, healthWarningDisabled]);

  // Filtering
  const filteredSongs = activeSection === 'All'
    ? songs
    : songs.filter(s => s.lang === activeSection);

  // ============================
  // Playback Handlers
  // ============================
  const handlePlay = (song) => {
    if (song.type === 'album' || song.type === 'artist' || song.type === 'playlist') {
      fetchDetail(song);
      return;
    }
    setCurrentSong(song);
    setIsPlaying(true);
    const newHist = [song, ...history.filter(h => h.id !== song.id)].slice(0, 20);
    setHistory(newHist);
    localStorage.setItem('auraplay_history', JSON.stringify(newHist));
    fetchRecommendations(newHist);
  };

  const togglePlayPause = () => setIsPlaying(!isPlaying);

  const handleNext = () => {
    const playList = queue.length > 0 ? queue : songs;
    const currentIndex = playList.findIndex(s => s.id === currentSong.id);
    if (isShuffle) {
      setCurrentSong(playList[Math.floor(Math.random() * playList.length)]);
    } else {
      setCurrentSong(playList[(currentIndex + 1) % playList.length] || playList[0]);
    }
    setIsPlaying(true);
  };

  const handlePrev = () => {
    const playList = queue.length > 0 ? queue : songs;
    const currentIndex = playList.findIndex(s => s.id === currentSong.id);
    setCurrentSong(playList[(currentIndex - 1 + playList.length) % playList.length] || playList[0]);
    setIsPlaying(true);
  };

  const handleTimeUpdate = () => setProgress(audioRef.current.currentTime);

  const handleLoadedMetadata = () => {
    setDuration(audioRef.current.duration);
    if (audioRef.current) audioRef.current.volume = volume;
  };

  const formatTime = (time) => {
    if (!time || isNaN(time)) return "00:00";
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.play().catch(e => console.log('Audio play error:', e));
      else audioRef.current.pause();
    }
  }, [isPlaying, currentSong]);

  const handleAudioEnded = () => {
    if (isRepeat) { audioRef.current.currentTime = 0; audioRef.current.play(); }
    else handleNext();
  };

  const handleImportPlaylist = async () => {
    if (!importUrl) return;
    setIsImporting(true);
    try {
      const response = await axios.post(`${API_BASE}/api/playlist/import`, { url: importUrl });
      if (response.data && response.data.tracks) {
        setSongs(prev => mergeDuplicates([...response.data.tracks, ...prev]));
        setExportModalOpen(false);
        setImportUrl('');
        alert(response.data.message);
      }
    } catch (err) { alert('Error fetching playlist.'); }
    finally { setIsImporting(false); }
  };

  const handleDownload = async (song) => {
    if (!song.audioUrl) return alert('Cannot download. Source unavailable.');
    try {
      alert(`Downloading ${song.title}...`);
      const response = await fetch(song.audioUrl);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64data = reader.result;
        let finalUri = '';
        if (Capacitor.isNativePlatform()) {
          const fileName = `auraplay_${song.id}.mp3`;
          await Filesystem.writeFile({ path: fileName, data: base64data, directory: Directory.Data });
          const uriResult = await Filesystem.getUri({ directory: Directory.Data, path: fileName });
          finalUri = Capacitor.convertFileSrc(uriResult.uri);
        } else {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none'; a.href = url; a.download = `${song.title} - ${song.artist}.mp3`;
          document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url);
          finalUri = song.audioUrl;
        }
        const offlineSong = { ...song, localUri: finalUri };
        const newDls = mergeDuplicates([offlineSong, ...downloads]);
        setDownloads(newDls);
        localStorage.setItem('auraplay_downloads', JSON.stringify(newDls));
      };
    } catch (err) { alert('Download failed.'); }
  };

  // Play all songs from detail view
  const playAllFromDetail = () => {
    if (detailView && detailView.songs.length > 0) {
      setQueue(detailView.songs);
      setCurrentSong(detailView.songs[0]);
      setIsPlaying(true);
      const newHist = [detailView.songs[0], ...history.filter(h => h.id !== detailView.songs[0].id)].slice(0, 20);
      setHistory(newHist);
      localStorage.setItem('auraplay_history', JSON.stringify(newHist));
    }
  };

  // ============================
  // RENDER
  // ============================
  return (
    <div className="app-container">
      <audio 
        ref={audioRef} 
        src={currentSong?.localUri || currentSong?.audioUrl || ''} 
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
          <button className={`nav-item ${activeTab === 'Home' ? 'active' : ''}`} onClick={() => { setActiveTab('Home'); setDetailView(null); }}>
            <Home size={20} /> <span>Home</span>
          </button>
          <button className={`nav-item ${activeTab === 'Explore' ? 'active' : ''}`} onClick={() => { setActiveTab('Explore'); setDetailView(null); }}>
            <Compass size={20} /> <span>Explore</span>
          </button>
          <button className={`nav-item ${activeTab === 'Library' ? 'active' : ''}`} onClick={() => { setActiveTab('Library'); setDetailView(null); }}>
            <Library size={20} /> <span>Library</span>
          </button>

          <div className="nav-section-title">Features</div>
          <button className="nav-item" onClick={() => setExportModalOpen(true)}>
            <Download size={20} /> <span>Import</span>
          </button>
          <button className="nav-item" onClick={() => setCloudModalOpen(true)}>
            <Cloud size={20} /> <span>Cloud Sync</span>
          </button>
          <button className="nav-item" onClick={() => { setActiveTab('Library'); setDetailView(null); }}>
            <ArrowDownToLine size={20} /> <span>Downloads</span>
          </button>
        </div>

        <div className="profile-selector glass" onClick={() => setProfileOpen(true)}>
          <div className="profile-avatar">{currentProfile.avatar}</div>
          <div style={{ flex: 1, textAlign: 'left', fontSize: '14px', fontWeight: 600 }}>{currentProfile.name}</div>
          <div className="online-indicator"></div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-wrapper">
        <header className="topbar glass-panel">
          <div className="search-bar">
            {isSearching 
              ? <Loader2 size={18} color="var(--primary)" className="spin-icon" style={{animation: 'spin-slow 1s linear infinite'}} /> 
              : <Search size={18} color="var(--text-muted)" />
            }
            <input 
              type="text" 
              placeholder={`Search ${searchCategory}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); }} style={{color: 'var(--text-muted)'}}>
                <X size={16} />
              </button>
            )}
          </div>
          <div className="search-filters" style={{display: 'flex', gap: '8px', padding: '0 10px', marginLeft: '10px'}}>
            {['songs', 'albums', 'artists', 'playlists'].map(cat => (
              <button 
                key={cat} 
                onClick={() => { setSearchCategory(cat); setDetailView(null); if (searchQuery) setSongs([]); }}
                style={{
                  background: searchCategory === cat ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                  border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '20px',
                  textTransform: 'capitalize', fontSize: '13px', cursor: 'pointer',
                  fontWeight: searchCategory === cat ? '700' : '500'
                }}
              >
                {cat === 'songs' && <Music size={14} style={{marginRight: 4, verticalAlign: 'middle'}} />}
                {cat === 'albums' && <Disc3 size={14} style={{marginRight: 4, verticalAlign: 'middle'}} />}
                {cat === 'artists' && <Users size={14} style={{marginRight: 4, verticalAlign: 'middle'}} />}
                {cat === 'playlists' && <ListMusic size={14} style={{marginRight: 4, verticalAlign: 'middle'}} />}
                {cat}
              </button>
            ))}
          </div>
          <div className="top-actions">
            <button className="action-btn" onClick={() => alert('No new notifications!')}><Bell size={18} /></button>
            <button className="action-btn" onClick={() => alert('Settings coming soon!')}><Settings size={18} /></button>
          </div>
        </header>

        <div className="main-content">
          
          {/* ======================== DETAIL VIEW ======================== */}
          {detailView ? (
            <div className="detail-view">
              <button 
                className="back-btn" 
                onClick={() => setDetailView(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)',
                  marginBottom: '24px', fontSize: '14px', fontWeight: '600'
                }}
              >
                <ChevronLeft size={20} /> Back to results
              </button>

              <div style={{
                display: 'flex', gap: '32px', marginBottom: '40px', alignItems: 'flex-end'
              }}>
                <img 
                  src={detailView.cover} 
                  alt={detailView.title}
                  style={{
                    width: '200px', height: '200px', objectFit: 'cover',
                    borderRadius: detailView.type === 'artist' ? '50%' : '20px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
                  }}
                />
                <div>
                  <div style={{fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--primary)', marginBottom: '8px', fontWeight: 700}}>
                    {detailView.type}
                  </div>
                  <h1 style={{fontSize: '42px', fontWeight: 800, letterSpacing: '-1px', marginBottom: '8px'}}>{detailView.title}</h1>
                  {detailView.artist && <p style={{color: 'var(--text-muted)', fontSize: '16px', marginBottom: '16px'}}>{detailView.artist}</p>}
                  {detailView.meta?.year && <span style={{color: 'var(--text-muted)', fontSize: '13px'}}>{detailView.meta.year} • {detailView.meta.language}</span>}
                  {detailView.meta?.songCount && <span style={{color: 'var(--text-muted)', fontSize: '13px'}}>{detailView.meta.songCount} songs</span>}
                  <div style={{marginTop: '20px', display: 'flex', gap: '12px'}}>
                    <button 
                      className="hero-btn" 
                      onClick={playAllFromDetail}
                      style={{display: 'flex', alignItems: 'center', gap: '8px'}}
                    >
                      <Play fill="white" size={16} /> Play All
                    </button>
                    <button 
                      className="hero-btn" 
                      style={{background: 'rgba(255,255,255,0.1)', color: 'var(--text-main)'}}
                      onClick={() => { if (detailView.songs.length > 0) { setQueue(prev => mergeDuplicates([...prev, ...detailView.songs])); alert('Added to queue!'); } }}
                    >
                      <Plus size={16} /> Add to Queue
                    </button>
                  </div>
                </div>
              </div>

              {/* Song List in Detail View */}
              {detailLoading ? (
                <div style={{textAlign: 'center', padding: '40px', color: 'var(--text-muted)'}}>
                  <Loader2 size={32} style={{animation: 'spin-slow 1s linear infinite'}} />
                  <p style={{marginTop: '12px'}}>Loading tracks...</p>
                </div>
              ) : detailView.songs.length > 0 ? (
                <div className="track-list">
                  {detailView.songs.map((song, i) => (
                    <div 
                      key={song.id} 
                      className="track-item"
                      onClick={() => { handlePlay(song); setQueue(detailView.songs); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '16px',
                        padding: '12px 16px', borderRadius: '12px', cursor: 'pointer',
                        background: currentSong.id === song.id ? 'rgba(249,168,38,0.1)' : 'transparent',
                        transition: 'background 0.2s ease',
                        borderBottom: '1px solid rgba(255,255,255,0.03)'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = currentSong.id === song.id ? 'rgba(249,168,38,0.15)' : 'rgba(255,255,255,0.03)'}
                      onMouseLeave={e => e.currentTarget.style.background = currentSong.id === song.id ? 'rgba(249,168,38,0.1)' : 'transparent'}
                    >
                      <span style={{width: '28px', textAlign: 'center', color: currentSong.id === song.id ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600, fontSize: '14px'}}>
                        {currentSong.id === song.id && isPlaying ? <Pause size={16} /> : (i + 1)}
                      </span>
                      <img src={song.cover} alt="" style={{width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover'}} />
                      <div style={{flex: 1, minWidth: 0}}>
                        <div style={{fontWeight: 600, fontSize: '15px', color: currentSong.id === song.id ? 'var(--primary)' : 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{song.title}</div>
                        <div style={{fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{song.artist}</div>
                      </div>
                      <button 
                        className="control-btn" 
                        onClick={(e) => { e.stopPropagation(); handleDownload(song); }}
                        style={{color: 'var(--text-muted)'}}
                      >
                        <ArrowDownToLine size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{color: 'var(--text-muted)', textAlign: 'center', padding: '40px'}}>No tracks found for this {detailView.type}.</p>
              )}
            </div>
          ) : (
            <>
              {/* ======================== EXPLORE TAB ======================== */}
              {activeTab === 'Explore' && (
                <>
                  <div className="hero-banner">
                    <div className="hero-subtitle">Explore</div>
                    <div className="hero-title">Discover New<br />Music Today.</div>
                    <button className="hero-btn" onClick={() => { setSearchQuery('new releases'); setSearchCategory('songs'); }}>Browse Hits</button>
                  </div>

                  <div className="section-title"><span>Search Results</span></div>
                  {isSearching && <div style={{textAlign: 'center', padding: '20px', color: 'var(--text-muted)'}}><Loader2 size={24} style={{animation: 'spin-slow 1s linear infinite'}} /></div>}
                  <div className="grid">
                    {filteredSongs.map((song) => (
                      <div className={`card ${song.type === 'artist' ? 'artist' : ''}`} key={song.id} onClick={() => handlePlay(song)}>
                        <div className="card-img-wrapper">
                          <img src={song.cover} alt={song.title} className="card-img" />
                          <div className="card-play-btn"><Play fill="white" size={20} /></div>
                        </div>
                        <div className="card-title">{song.title}</div>
                        <div className="card-subtitle">{song.artist || song.role || song.language || ''}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* ======================== LIBRARY TAB ======================== */}
              {activeTab === 'Library' && (
                <>
                  <div className="section-title"><span>Your Downloads & Offline Music</span></div>
                  {downloads.length === 0 ? (
                    <div style={{textAlign: 'center', padding: '60px 20px'}}>
                      <ArrowDownToLine size={48} color="var(--text-muted)" style={{marginBottom: '16px', opacity: 0.4}} />
                      <p style={{color: 'var(--text-muted)', fontSize: '16px'}}>No downloaded songs yet.</p>
                      <p style={{color: 'var(--text-muted)', fontSize: '13px', marginTop: '8px'}}>Click the download icon on any song to save it offline.</p>
                    </div>
                  ) : (
                    <div className="grid">
                      {downloads.map((song) => (
                        <div className="card" key={song.id} onClick={() => handlePlay(song)}>
                          <div className="card-img-wrapper">
                            <img src={song.cover} alt="Cover" className="card-img" />
                            <div className="card-play-btn"><Play fill="white" size={20} /></div>
                          </div>
                          <div className="card-title">{song.title}</div>
                          <div className="card-subtitle">{song.artist} • Offline</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {history.length > 0 && (
                    <>
                      <div className="section-title" style={{marginTop: '32px'}}><span>Recently Played</span></div>
                      <div className="grid">
                        {history.slice(0, 10).map((song) => (
                          <div className="card" key={song.id} onClick={() => handlePlay(song)}>
                            <div className="card-img-wrapper">
                              <img src={song.cover} alt="Cover" className="card-img" />
                              <div className="card-play-btn"><Play fill="white" size={20} /></div>
                            </div>
                            <div className="card-title">{song.title}</div>
                            <div className="card-subtitle">{song.artist}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}

              {/* ======================== HOME TAB ======================== */}
              {activeTab === 'Home' && (
                <>
                  {/* Language Filters */}
                  <div className="categories" style={{display: 'flex', gap: '10px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '8px'}}>
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

                  {/* Hero */}
                  <div className="hero-banner">
                    <div className="hero-subtitle">Trending Now</div>
                    <div className="hero-title">Experience The<br />Purest Sound.</div>
                    <button className="hero-btn" onClick={() => { setActiveTab('Library'); }}>My Library</button>
                  </div>

                  {/* ML Recommendations */}
                  {mlRecommendations.length > 0 && !searchQuery && (
                    <>
                      <div className="section-title" style={{marginTop: '20px'}}><span>Recommended For You</span></div>
                      <div className="grid">
                        {mlRecommendations.slice(0, 5).map((song) => (
                          <div className="card" key={song.id} onClick={() => handlePlay(song)}>
                            <div className="card-img-wrapper">
                              <img src={song.cover} alt="Cover" className="card-img" />
                              <div className="card-play-btn"><Play fill="white" size={20} /></div>
                            </div>
                            <div className="card-title">{song.title}</div>
                            <div className="card-subtitle">{song.artist} • For You</div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Main Results Grid */}
                  <div className="section-title">
                    <span>{searchQuery ? `Results for "${searchQuery}"` : 'Popular Music'}</span>
                  </div>

                  {isLoading || isSearching ? (
                    <div style={{textAlign: 'center', padding: '40px', color: 'var(--text-muted)'}}>
                      <Loader2 size={32} style={{animation: 'spin-slow 1s linear infinite'}} />
                      <p style={{marginTop: '12px'}}>Fetching music...</p>
                    </div>
                  ) : filteredSongs.length === 0 ? (
                    <div style={{textAlign: 'center', padding: '60px 20px'}}>
                      <Search size={48} color="var(--text-muted)" style={{marginBottom: '16px', opacity: 0.4}} />
                      <p style={{color: 'var(--text-muted)', fontSize: '16px'}}>No results found.</p>
                      <p style={{color: 'var(--text-muted)', fontSize: '13px', marginTop: '8px'}}>Try searching for a song, album, or artist.</p>
                    </div>
                  ) : (
                    <div className="grid">
                      {filteredSongs.map((song) => (
                        <div className={`card ${song.type === 'artist' ? 'artist' : ''}`} key={song.id} onClick={() => handlePlay(song)}>
                          <div className="card-img-wrapper">
                            <img src={song.cover} alt={song.title} className="card-img" />
                            <div className="card-play-btn"><Play fill="white" size={20} /></div>
                          </div>
                          <div className="card-title">{song.title}</div>
                          <div className="card-subtitle">
                            {song.type === 'artist' ? (song.role || 'Artist') 
                              : song.type === 'album' ? `${song.artist || ''} • ${song.year || ''}`
                              : song.type === 'playlist' ? `${song.songCount || ''} songs • ${song.language || ''}`
                              : `${song.artist || ''} • ${song.platform || song.lang || ''}`
                            }
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Quick Artists Row */}
                  {!searchQuery && (
                    <>
                      <div className="section-title"><span>Popular Artists</span></div>
                      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
                        {['A.R. Rahman', 'Anirudh', 'Arijit Singh', 'Shreya Ghoshal', 'Devi Sri Prasad'].map((artist, i) => (
                          <div 
                            className="card artist" 
                            key={i} 
                            onClick={() => { setSearchQuery(artist); setSearchCategory('songs'); }}
                          >
                            <div className="card-img-wrapper">
                              <div style={{width: '100%', height: '100%', background: `linear-gradient(135deg, hsl(${i * 50 + 20}, 70%, 40%), hsl(${i * 50 + 60}, 80%, 30%))`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                <Music size={40} color="rgba(255,255,255,0.3)" />
                              </div>
                            </div>
                            <div className="card-title">{artist}</div>
                            <div className="card-subtitle">Artist</div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </main>

      {/* FLOATING DYNAMIC ISLAND PLAYER */}
      <div className="player-bar-container">
        <div className="player-island">
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
            <button className="control-btn" style={{ marginLeft: '8px' }} onClick={() => handleDownload(currentSong)} title="Download">
              <ArrowDownToLine size={18} color="var(--primary)" />
            </button>
          </div>

          <div className="player-center">
            <div className="player-controls">
              <button className="control-btn" style={{color: isShuffle ? 'var(--primary)' : 'white'}} onClick={() => setIsShuffle(!isShuffle)}><Shuffle size={18} /></button>
              <button className="control-btn" onClick={handlePrev}><SkipBack size={22} /></button>
              <button
                className="play-pause-btn"
                style={{ background: drivingMode ? 'var(--secondary)' : 'var(--primary)', color: 'white' }}
                onClick={togglePlayPause}
              >
                {isPlaying ? <Pause fill="white" size={18} /> : <Play fill="white" size={18} />}
              </button>
              <button className="control-btn" onClick={handleNext}><SkipForward size={22} /></button>
              <button className="control-btn" style={{color: isRepeat ? 'var(--primary)' : 'white'}} onClick={() => setIsRepeat(!isRepeat)}><Repeat size={18} /></button>
            </div>
            <div className="progress-container">
              <span>{formatTime(progress)}</span>
              <div className="progress-bar-bg" style={{position: 'relative', display: 'flex', alignItems: 'center'}}>
                <input 
                  type="range" min="0" max={duration || 100} value={progress}
                  onChange={(e) => { audioRef.current.currentTime = e.target.value; setProgress(e.target.value); }}
                  style={{position: 'absolute', width: '100%', opacity: 0, cursor: 'pointer', zIndex: 5, height: '10px'}}
                />
                <div className="progress-bar-fill" style={{ background: drivingMode ? 'var(--secondary)' : 'var(--primary)', width: `${(progress / (duration || 1)) * 100}%` }}></div>
              </div>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="player-right">
            <button className="control-btn" onClick={() => setDrivingMode(!drivingMode)} style={{ color: drivingMode ? 'var(--secondary)' : 'var(--text-muted)' }} title="Driving Mode">
              <Car size={20} />
            </button>
            <button className="control-btn"><Volume2 size={20} /></button>
            <div className="volume-bar" style={{ opacity: drivingMode ? 0.5 : 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input 
                type="range" min="0" max="1" step="0.01" value={volume}
                onChange={(e) => { const v = parseFloat(e.target.value); setVolume(v); if(audioRef.current) audioRef.current.volume = v; }}
                style={{position: 'absolute', width: '100%', opacity: 0, cursor: 'pointer', zIndex: 5, height: '10px'}}
              />
              <div className="volume-fill" style={{ width: drivingMode ? '25%' : `${volume * 100}%`, background: drivingMode ? 'var(--secondary)' : 'white' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* HEALTH HAZARD MODAL */}
      <div className={`modal-overlay ${healthWarningOpen ? 'active' : ''}`}>
        <div className="modal-content glass" style={{ border: '1px solid var(--secondary)', boxShadow: '0 0 30px rgba(255, 94, 98, 0.2)' }}>
          <div className="modal-header">
            <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--secondary)' }}>
              <AlertTriangle size={24} /> Health Warning
            </div>
            <button onClick={() => setHealthWarningOpen(false)}><X size={24} /></button>
          </div>
          <p style={{ marginBottom: '20px', color: 'var(--text-main)', lineHeight: '1.6' }}>
            You have been listening for several hours. Prolonged exposure to continuous sound can cause fatigue.
            <br /><br /><strong>We recommend taking a short break.</strong>
          </p>
          <div style={{display: 'flex', gap: '10px'}}>
            <button className="hero-btn" style={{ flex: 1, background: 'var(--secondary)', boxShadow: 'none' }} onClick={() => setHealthWarningOpen(false)}>Dismiss</button>
            <button className="hero-btn" style={{ flex: 1, background: 'rgba(255,255,255,0.1)', color: 'var(--text-muted)', boxShadow: 'none' }} onClick={() => { setHealthWarningDisabled(true); setHealthWarningOpen(false); }}>Disable</button>
          </div>
        </div>
      </div>

      {/* IMPORT PLAYLISTS MODAL */}
      <div className={`modal-overlay ${exportModalOpen ? 'active' : ''}`}>
        <div className="modal-content glass">
          <div className="modal-header">
            <div className="modal-title">Import Playlists</div>
            <button onClick={() => setExportModalOpen(false)}><X size={24} /></button>
          </div>
          <p style={{ marginBottom: '20px', color: 'var(--text-muted)' }}>
            No login required! Just paste a link.
          </p>
          <button className="integration-btn">
            <div style={{ background: '#1DB954', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Music size={16} color="white" /></div>
            <div style={{ flex: 1, textAlign: 'left' }}>Import from Spotify</div>
          </button>
          <button className="integration-btn">
            <div style={{ background: '#FF0000', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><PlayCircle size={16} color="white" /></div>
            <div style={{ flex: 1, textAlign: 'left' }}>Import from YouTube</div>
          </button>
          <button className="integration-btn">
            <div style={{ background: '#2BC5B4', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Music size={16} color="white" /></div>
            <div style={{ flex: 1, textAlign: 'left' }}>Import from JioSaavn</div>
          </button>
          <div style={{ marginTop: '20px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>OR PASTE LINK</div>
            <div className="search-bar" style={{ width: '100%', background: 'rgba(0,0,0,0.3)' }}>
              <input type="text" placeholder="https://spotify.com/playlist..." value={importUrl} onChange={e => setImportUrl(e.target.value)} />
              <button onClick={handleImportPlaylist} disabled={isImporting} style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
                {isImporting ? 'Syncing...' : 'Fetch'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CLOUD SYNC MODAL */}
      <div className={`modal-overlay ${cloudModalOpen ? 'active' : ''}`}>
        <div className="modal-content glass">
          <div className="modal-header">
            <div className="modal-title">Cloud Sync</div>
            <button onClick={() => setCloudModalOpen(false)}><X size={24} /></button>
          </div>
          <p style={{ marginBottom: '20px', color: 'var(--text-muted)' }}>Save your offline music directly to your cloud storage.</p>
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
              type="text" placeholder="New profile name..."
              value={newProfileName} onChange={e => setNewProfileName(e.target.value)}
              style={{flex: 1, background: 'rgba(0,0,0,0.3)', border: 'none', padding: '8px', color: 'white', borderRadius: '8px'}}
            />
            <button className="integration-btn" style={{justifyContent: 'center', color: 'var(--primary)'}}
              onClick={() => { if(newProfileName.trim() !== '') { mockProfiles.push({ id: Date.now(), name: newProfileName, avatar: newProfileName[0].toUpperCase() }); setNewProfileName(''); setProfileOpen(false); } }}
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

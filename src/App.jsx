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

// ============================================================
// CONFIGURATION
// ============================================================
const API_BASE = 'https://auraplay.onrender.com';
const LANG_FILTERS = ['All', 'Telugu', 'Hindi', 'English', 'Tamil', 'Malayalam'];
const SEARCH_CATS = ['songs', 'albums', 'artists', 'playlists'];
const CAT_ICONS = { songs: Music, albums: Disc3, artists: Users, playlists: ListMusic };

const PLACEHOLDER_SONG = {
  id: 'placeholder', title: 'AuraPlay', artist: 'Search to begin',
  cover: 'https://images.unsplash.com/photo-1614113489855-66422ad300a4?w=200',
  audioUrl: '', lang: ''
};

const PROFILES = [
  { id: 1, name: 'Rohit', avatar: 'R' },
  { id: 2, name: 'Guest', avatar: 'G' },
];

// ============================================================
// UTILITIES
// ============================================================
const dedupe = (list) => {
  const seen = new Set();
  return (list || []).filter(item => {
    const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const key = `${norm(item.title)}-${norm(item.artist)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const fmtTime = (t) => {
  if (!t || isNaN(t)) return '0:00';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

// ============================================================
// APP COMPONENT
// ============================================================
function App() {
  // Navigation
  const [tab, setTab] = useState('Home');
  const [lang, setLang] = useState('All');

  // Data
  const [songs, setSongs] = useState([]);
  const [queue, setQueue] = useState([]);
  const [history, setHistory] = useState([]);
  const [downloads, setDownloads] = useState([]);
  const [mlPicks, setMlPicks] = useState([]);

  // Search
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('songs');
  const [searching, setSearching] = useState(false);
  const [booting, setBooting] = useState(true);

  // Player
  const [current, setCurrent] = useState(PLACEHOLDER_SONG);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [vol, setVol] = useState(0.7);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [drivingMode, setDrivingMode] = useState(false);
  const audioRef = useRef(null);

  // Detail view (album / artist / playlist drill-down)
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Modals
  const [importOpen, setImportOpen] = useState(false);
  const [cloudOpen, setCloudOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [healthOpen, setHealthOpen] = useState(false);
  const [healthOff, setHealthOff] = useState(false);
  const [profile, setProfile] = useState(PROFILES[0]);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [newName, setNewName] = useState('');
  const [listenSec, setListenSec] = useState(0);

  // ============================
  // BOOT
  // ============================
  useEffect(() => {
    (async () => {
      setBooting(true);
      try {
        const r = await axios.get(`${API_BASE}/api/search/songs?q=trending`);
        if (r.data?.length) { setSongs(r.data); setQueue(r.data); setCurrent(r.data[0]); }
      } catch {
        try {
          const fb = await axios.get(`${API_BASE}/api/search/songs?q=latest hits`);
          if (fb.data?.length) { setSongs(fb.data); setQueue(fb.data); setCurrent(fb.data[0]); }
        } catch { /* offline mode */ }
      }
      setBooting(false);
    })();
    setHistory(JSON.parse(localStorage.getItem('aura_hist') || '[]'));
    setDownloads(JSON.parse(localStorage.getItem('aura_dl') || '[]'));
  }, []);

  // Boot ML
  useEffect(() => {
    const h = JSON.parse(localStorage.getItem('aura_hist') || '[]');
    if (h.length) fetchML(h);
  }, []);

  // ============================
  // SEARCH (debounced)
  // ============================
  useEffect(() => {
    if (!query.trim()) return;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await axios.get(`${API_BASE}/api/search/${category}?q=${encodeURIComponent(query)}`);
        if (r.data) { setSongs(r.data); if (category === 'songs') setQueue(r.data); }
      } catch { /* silent */ }
      setSearching(false);
    }, 400);
    return () => clearTimeout(t);
  }, [query, category]);

  // ============================
  // ML RECOMMENDATIONS
  // ============================
  const fetchML = async (h) => {
    try {
      const r = await axios.post(`${API_BASE}/api/recommend`, { history: h });
      if (r.data?.length) setMlPicks(r.data);
    } catch { /* silent */ }
  };

  // ============================
  // DETAIL FETCHER (album / artist / playlist)
  // ============================
  const openDetail = async (item) => {
    setDetailLoading(true);
    setDetail({ ...item, songs: [] });
    try {
      let data;
      if (item.type === 'album') {
        data = (await axios.get(`${API_BASE}/api/albums/${item.id}`)).data;
      } else if (item.type === 'artist') {
        data = (await axios.get(`${API_BASE}/api/artists/${item.id}`)).data;
      } else {
        const r = await axios.get(`${API_BASE}/api/search/songs?q=${encodeURIComponent(item.title)}`);
        data = { songs: r.data || [], title: item.title, cover: item.cover };
      }
      if (data) {
        setDetail(prev => ({ ...prev, ...data, songs: data.songs || [] }));
        if (data.songs?.length) setQueue(data.songs);
      }
    } catch {
      try {
        const fb = await axios.get(`${API_BASE}/api/search/songs?q=${encodeURIComponent(item.title)}`);
        if (fb.data?.length) { setDetail(prev => ({ ...prev, songs: fb.data })); setQueue(fb.data); }
      } catch { /* silent */ }
    }
    setDetailLoading(false);
  };

  // ============================
  // PLAYBACK
  // ============================
  const playSong = (song) => {
    if (['album', 'artist', 'playlist'].includes(song.type)) { openDetail(song); return; }
    setCurrent(song); setPlaying(true);
    const h = [song, ...history.filter(x => x.id !== song.id)].slice(0, 30);
    setHistory(h); localStorage.setItem('aura_hist', JSON.stringify(h));
    fetchML(h);
  };

  const next = () => {
    const list = queue.length ? queue : songs;
    if (!list.length) return;
    const i = list.findIndex(s => s.id === current.id);
    const n = shuffle ? list[Math.floor(Math.random() * list.length)] : list[(i + 1) % list.length];
    setCurrent(n); setPlaying(true);
  };

  const prev = () => {
    const list = queue.length ? queue : songs;
    if (!list.length) return;
    const i = list.findIndex(s => s.id === current.id);
    setCurrent(list[(i - 1 + list.length) % list.length]); setPlaying(true);
  };

  useEffect(() => {
    if (!audioRef.current) return;
    if (playing) audioRef.current.play().catch(() => {});
    else audioRef.current.pause();
  }, [playing, current]);

  const onEnded = () => { if (repeat) { audioRef.current.currentTime = 0; audioRef.current.play(); } else next(); };
  const onTime = () => setProgress(audioRef.current.currentTime);
  const onMeta = () => { setDuration(audioRef.current.duration); audioRef.current.volume = vol; };

  // Health tracker
  useEffect(() => {
    if (!playing || healthOff) return;
    const t = setInterval(() => setListenSec(p => { if (p + 1 === 7200) setHealthOpen(true); return p + 1; }), 1000);
    return () => clearInterval(t);
  }, [playing, healthOff]);

  // Filter by language
  const filtered = lang === 'All' ? songs : songs.filter(s => s.lang === lang);

  // ============================
  // DOWNLOAD
  // ============================
  const downloadSong = async (song) => {
    if (!song.audioUrl) return alert('No audio source available.');
    try {
      const res = await fetch(song.audioUrl);
      const blob = await res.blob();
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        let uri = song.audioUrl;
        if (Capacitor.isNativePlatform()) {
          const fn = `auraplay_${song.id}.mp3`;
          await Filesystem.writeFile({ path: fn, data: reader.result, directory: Directory.Data });
          const u = await Filesystem.getUri({ directory: Directory.Data, path: fn });
          uri = Capacitor.convertFileSrc(u.uri);
        } else {
          const a = document.createElement('a');
          a.href = window.URL.createObjectURL(blob);
          a.download = `${song.title} - ${song.artist}.mp3`;
          a.click(); window.URL.revokeObjectURL(a.href);
        }
        const dl = dedupe([{ ...song, localUri: uri }, ...downloads]);
        setDownloads(dl); localStorage.setItem('aura_dl', JSON.stringify(dl));
      };
    } catch { alert('Download failed.'); }
  };

  // Import playlist
  const doImport = async () => {
    if (!importUrl) return;
    setImporting(true);
    try {
      const r = await axios.post(`${API_BASE}/api/playlist/import`, { url: importUrl });
      if (r.data?.tracks) { setSongs(p => dedupe([...r.data.tracks, ...p])); setImportOpen(false); setImportUrl(''); }
    } catch { alert('Import failed.'); }
    setImporting(false);
  };

  // Play all from detail
  const playAll = () => {
    if (!detail?.songs?.length) return;
    setQueue(detail.songs); setCurrent(detail.songs[0]); setPlaying(true);
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="app-container">
      <audio ref={audioRef} src={current?.localUri || current?.audioUrl || ''} onEnded={onEnded} onTimeUpdate={onTime} onLoadedMetadata={onMeta} />

      {/* ==================== SIDEBAR ==================== */}
      <aside className="sidebar glass">
        <div className="brand">
          <Music className="brand-icon" size={28} />
          <span className="text-gradient">AuraPlay</span>
        </div>
        <nav className="nav-menu">
          <div className="nav-section-title">Menu</div>
          {[['Home', Home], ['Explore', Compass], ['Library', Library]].map(([name, Icon]) => (
            <button key={name} className={`nav-item ${tab === name ? 'active' : ''}`} onClick={() => { setTab(name); setDetail(null); }}>
              <Icon size={20} /><span>{name}</span>
            </button>
          ))}
          <div className="nav-section-title">Features</div>
          <button className="nav-item" onClick={() => setImportOpen(true)}><Download size={20} /><span>Import</span></button>
          <button className="nav-item" onClick={() => setCloudOpen(true)}><Cloud size={20} /><span>Cloud Sync</span></button>
          <button className="nav-item" onClick={() => { setTab('Library'); setDetail(null); }}><ArrowDownToLine size={20} /><span>Downloads</span></button>
        </nav>
        <div className="profile-selector glass" onClick={() => setProfileOpen(true)}>
          <div className="profile-avatar">{profile.avatar}</div>
          <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{profile.name}</div>
          <div className="online-indicator" />
        </div>
      </aside>

      {/* ==================== MAIN ==================== */}
      <main className="main-wrapper">

        {/* TOP BAR */}
        <header className="topbar glass-panel">
          <div className="search-bar">
            {searching ? <Loader2 size={18} color="var(--primary)" style={{animation:'spin-slow 1s linear infinite'}} /> : <Search size={18} color="var(--text-muted)" />}
            <input type="text" placeholder={`Search ${category}...`} value={query} onChange={e => setQuery(e.target.value)} />
            {query && <button onClick={() => setQuery('')} style={{color:'var(--text-muted)'}}><X size={16} /></button>}
          </div>
          <div className="search-filters">
            {SEARCH_CATS.map(c => {
              const Icon = CAT_ICONS[c];
              return (
                <button key={c} className={`filter-pill ${category === c ? 'active' : ''}`} onClick={() => { setCategory(c); setDetail(null); if (query) setSongs([]); }}>
                  <Icon size={14} />{c}
                </button>
              );
            })}
          </div>
          <div className="top-actions">
            <button className="action-btn"><Bell size={18} /></button>
            <button className="action-btn"><Settings size={18} /></button>
          </div>
        </header>

        {/* CONTENT AREA */}
        <div className="main-content">

          {/* ---------- DETAIL VIEW ---------- */}
          {detail ? (
            <section className="detail-view">
              <button className="back-btn" onClick={() => setDetail(null)}><ChevronLeft size={20} /> Back</button>

              <div className="detail-header">
                <img src={detail.cover} alt="" className={`detail-cover ${detail.type === 'artist' ? 'round' : ''}`} />
                <div className="detail-info">
                  <span className="detail-type">{detail.type}</span>
                  <h1 className="detail-title">{detail.title}</h1>
                  {detail.artist && <p className="detail-artist">{detail.artist}</p>}
                  {(detail.year || detail.language) && <p className="detail-meta">{detail.year}{detail.year && detail.language ? ' • ' : ''}{detail.language}</p>}
                  {detail.songCount && <p className="detail-meta">{detail.songCount} songs</p>}
                  {detail.fanCount && <p className="detail-meta">{detail.fanCount} fans</p>}
                  <div className="detail-actions">
                    <button className="btn-primary" onClick={playAll}><Play fill="white" size={16} /> Play All</button>
                    <button className="btn-secondary" onClick={() => { if (detail.songs?.length) { setQueue(p => dedupe([...p, ...detail.songs])); } }}><Plus size={16} /> Queue</button>
                  </div>
                </div>
              </div>

              {detailLoading ? (
                <div className="center-msg"><Loader2 size={32} className="spinner" /><p>Loading tracks...</p></div>
              ) : detail.songs?.length > 0 ? (
                <div className="track-list">
                  {detail.songs.map((s, i) => (
                    <div key={s.id} className={`track-row ${current.id === s.id ? 'active' : ''}`} onClick={() => { playSong(s); setQueue(detail.songs); }}>
                      <span className="track-num">{current.id === s.id && playing ? <Pause size={14} /> : i + 1}</span>
                      <img src={s.cover} alt="" className="track-thumb" />
                      <div className="track-info">
                        <div className="track-name">{s.title}</div>
                        <div className="track-artist">{s.artist}</div>
                      </div>
                      {s.duration && <span className="track-dur">{fmtTime(s.duration)}</span>}
                      <button className="track-dl" onClick={e => { e.stopPropagation(); downloadSong(s); }}><ArrowDownToLine size={16} /></button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="center-msg"><p>No tracks found.</p></div>
              )}
            </section>

          ) : (
            <>
              {/* ---------- HOME ---------- */}
              {tab === 'Home' && (
                <>
                  <div className="lang-filters">
                    {LANG_FILTERS.map(l => (
                      <button key={l} className={`category-pill ${lang === l ? 'active' : ''}`} onClick={() => setLang(l)}>{l}</button>
                    ))}
                  </div>

                  <div className="hero-banner">
                    <div className="hero-subtitle">Trending Now</div>
                    <div className="hero-title">Experience The<br />Purest Sound.</div>
                    <button className="hero-btn" onClick={() => setTab('Library')}>My Library</button>
                  </div>

                  {mlPicks.length > 0 && !query && (
                    <section>
                      <div className="section-title"><span>Recommended For You</span></div>
                      <div className="grid">
                        {mlPicks.slice(0, 5).map(s => (
                          <div className="card" key={s.id} onClick={() => playSong(s)}>
                            <div className="card-img-wrapper"><img src={s.cover} alt="" className="card-img" /><div className="card-play-btn"><Play fill="white" size={20} /></div></div>
                            <div className="card-title">{s.title}</div>
                            <div className="card-subtitle">{s.artist} • For You</div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  <div className="section-title"><span>{query ? `Results for "${query}"` : 'Popular Music'}</span></div>

                  {(booting || searching) ? (
                    <div className="center-msg"><Loader2 size={32} className="spinner" /><p>Loading...</p></div>
                  ) : filtered.length === 0 ? (
                    <div className="center-msg"><Search size={48} style={{opacity:.3}} /><p>No results. Try searching for a song, album, or artist.</p></div>
                  ) : (
                    <div className="grid">
                      {filtered.map(s => (
                        <div className={`card ${s.type === 'artist' ? 'artist' : ''}`} key={s.id} onClick={() => playSong(s)}>
                          <div className="card-img-wrapper"><img src={s.cover} alt="" className="card-img" /><div className="card-play-btn"><Play fill="white" size={20} /></div></div>
                          <div className="card-title">{s.title}</div>
                          <div className="card-subtitle">
                            {s.type === 'artist' ? (s.role || 'Artist')
                              : s.type === 'album' ? `${s.artist || ''} • ${s.year || ''}`
                              : s.type === 'playlist' ? `${s.songCount || ''} songs`
                              : `${s.artist || ''}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {!query && (
                    <section>
                      <div className="section-title"><span>Popular Artists</span></div>
                      <div className="grid artist-grid">
                        {['A.R. Rahman', 'Anirudh', 'Arijit Singh', 'Shreya Ghoshal', 'Devi Sri Prasad', 'Sid Sriram'].map((a, i) => (
                          <div className="card artist" key={i} onClick={() => { setQuery(a); setCategory('songs'); }}>
                            <div className="card-img-wrapper">
                              <div className="artist-placeholder" style={{background: `linear-gradient(135deg, hsl(${i*55+20},65%,45%), hsl(${i*55+60},75%,35%))`}}>
                                <Music size={36} color="rgba(255,255,255,0.25)" />
                              </div>
                            </div>
                            <div className="card-title">{a}</div>
                            <div className="card-subtitle">Artist</div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}

              {/* ---------- EXPLORE ---------- */}
              {tab === 'Explore' && (
                <>
                  <div className="hero-banner">
                    <div className="hero-subtitle">Explore</div>
                    <div className="hero-title">Discover New<br />Music Today.</div>
                    <button className="hero-btn" onClick={() => { setQuery('new releases'); setCategory('songs'); }}>Browse Hits</button>
                  </div>
                  {searching && <div className="center-msg"><Loader2 size={24} className="spinner" /></div>}
                  <div className="section-title"><span>Search Results</span></div>
                  <div className="grid">
                    {filtered.map(s => (
                      <div className={`card ${s.type === 'artist' ? 'artist' : ''}`} key={s.id} onClick={() => playSong(s)}>
                        <div className="card-img-wrapper"><img src={s.cover} alt="" className="card-img" /><div className="card-play-btn"><Play fill="white" size={20} /></div></div>
                        <div className="card-title">{s.title}</div>
                        <div className="card-subtitle">{s.artist || s.role || s.language || ''}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* ---------- LIBRARY ---------- */}
              {tab === 'Library' && (
                <>
                  <div className="section-title"><span>Downloads & Offline</span></div>
                  {downloads.length === 0 ? (
                    <div className="center-msg"><ArrowDownToLine size={48} style={{opacity:.3}} /><p>No downloads yet. Tap the download icon on any song.</p></div>
                  ) : (
                    <div className="grid">
                      {downloads.map(s => (
                        <div className="card" key={s.id} onClick={() => playSong(s)}>
                          <div className="card-img-wrapper"><img src={s.cover} alt="" className="card-img" /><div className="card-play-btn"><Play fill="white" size={20} /></div></div>
                          <div className="card-title">{s.title}</div>
                          <div className="card-subtitle">{s.artist} • Offline</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {history.length > 0 && (
                    <section>
                      <div className="section-title" style={{marginTop:32}}><span>Recently Played</span></div>
                      <div className="grid">
                        {history.slice(0, 10).map(s => (
                          <div className="card" key={s.id} onClick={() => playSong(s)}>
                            <div className="card-img-wrapper"><img src={s.cover} alt="" className="card-img" /><div className="card-play-btn"><Play fill="white" size={20} /></div></div>
                            <div className="card-title">{s.title}</div>
                            <div className="card-subtitle">{s.artist}</div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </main>

      {/* ==================== PLAYER ISLAND ==================== */}
      <div className="player-bar-container">
        <div className="player-island">
          <div className="player-left">
            <img src={current.cover} alt="" className={`now-playing-img ${playing ? 'playing' : ''}`} />
            <div className="now-playing-info">
              <div className="song-title">{current.title}</div>
              <div className="song-artist">{current.artist}</div>
            </div>
            <button className="control-btn" onClick={() => downloadSong(current)} title="Download"><ArrowDownToLine size={18} color="var(--primary)" /></button>
          </div>
          <div className="player-center">
            <div className="player-controls">
              <button className="control-btn" style={{color: shuffle ? 'var(--primary)' : ''}} onClick={() => setShuffle(!shuffle)}><Shuffle size={18} /></button>
              <button className="control-btn" onClick={prev}><SkipBack size={22} /></button>
              <button className="play-pause-btn" style={{background: drivingMode ? 'var(--secondary)' : 'var(--primary)'}} onClick={() => setPlaying(!playing)}>
                {playing ? <Pause fill="white" size={18} /> : <Play fill="white" size={18} />}
              </button>
              <button className="control-btn" onClick={next}><SkipForward size={22} /></button>
              <button className="control-btn" style={{color: repeat ? 'var(--primary)' : ''}} onClick={() => setRepeat(!repeat)}><Repeat size={18} /></button>
            </div>
            <div className="progress-container">
              <span>{fmtTime(progress)}</span>
              <div className="progress-bar-bg">
                <input type="range" min="0" max={duration || 100} value={progress} onChange={e => { audioRef.current.currentTime = e.target.value; setProgress(+e.target.value); }} className="range-input" />
                <div className="progress-bar-fill" style={{width: `${(progress/(duration||1))*100}%`, background: drivingMode ? 'var(--secondary)' : 'var(--primary)'}} />
              </div>
              <span>{fmtTime(duration)}</span>
            </div>
          </div>
          <div className="player-right">
            <button className="control-btn" onClick={() => setDrivingMode(!drivingMode)} style={{color: drivingMode ? 'var(--secondary)' : ''}} title="Driving Mode"><Car size={20} /></button>
            <button className="control-btn"><Volume2 size={20} /></button>
            <div className="volume-bar">
              <input type="range" min="0" max="1" step="0.01" value={vol} onChange={e => { setVol(+e.target.value); if(audioRef.current) audioRef.current.volume = +e.target.value; }} className="range-input" />
              <div className="volume-fill" style={{width: `${vol*100}%`, background: drivingMode ? 'var(--secondary)' : 'white'}} />
            </div>
          </div>
        </div>
      </div>

      {/* ==================== MODALS ==================== */}

      {/* Health */}
      <div className={`modal-overlay ${healthOpen ? 'active' : ''}`}>
        <div className="modal-content glass" style={{border:'1px solid var(--secondary)'}}>
          <div className="modal-header">
            <div className="modal-title" style={{color:'var(--secondary)', display:'flex', alignItems:'center', gap:10}}><AlertTriangle size={24} /> Health Warning</div>
            <button onClick={() => setHealthOpen(false)}><X size={24} /></button>
          </div>
          <p style={{marginBottom:20, lineHeight:1.6}}>You've been listening for a long time. Take a short break for your hearing health.</p>
          <div style={{display:'flex', gap:10}}>
            <button className="btn-primary" style={{flex:1, background:'var(--secondary)'}} onClick={() => setHealthOpen(false)}>Dismiss</button>
            <button className="btn-secondary" style={{flex:1}} onClick={() => { setHealthOff(true); setHealthOpen(false); }}>Disable</button>
          </div>
        </div>
      </div>

      {/* Import */}
      <div className={`modal-overlay ${importOpen ? 'active' : ''}`}>
        <div className="modal-content glass">
          <div className="modal-header">
            <div className="modal-title">Import Playlists</div>
            <button onClick={() => setImportOpen(false)}><X size={24} /></button>
          </div>
          <p style={{marginBottom:20, color:'var(--text-muted)'}}>No login required. Paste a playlist link below.</p>
          {[['Spotify','#1DB954'],['YouTube','#FF0000'],['JioSaavn','#2BC5B4']].map(([name, bg]) => (
            <button className="integration-btn" key={name}>
              <div style={{background:bg, width:32, height:32, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center'}}><Music size={16} color="white" /></div>
              <div style={{flex:1, textAlign:'left'}}>Import from {name}</div>
            </button>
          ))}
          <div style={{marginTop:20}}>
            <div style={{fontSize:12, color:'var(--text-muted)', marginBottom:8}}>OR PASTE LINK</div>
            <div className="search-bar" style={{width:'100%', background:'rgba(0,0,0,0.3)'}}>
              <input type="text" placeholder="https://..." value={importUrl} onChange={e => setImportUrl(e.target.value)} />
              <button onClick={doImport} disabled={importing} style={{color:'var(--primary)', fontWeight:'bold'}}>{importing ? 'Syncing...' : 'Fetch'}</button>
            </div>
          </div>
        </div>
      </div>

      {/* Cloud */}
      <div className={`modal-overlay ${cloudOpen ? 'active' : ''}`}>
        <div className="modal-content glass">
          <div className="modal-header">
            <div className="modal-title">Cloud Sync</div>
            <button onClick={() => setCloudOpen(false)}><X size={24} /></button>
          </div>
          <p style={{marginBottom:20, color:'var(--text-muted)'}}>Save offline music to your cloud.</p>
          <button className="integration-btn"><div style={{background:'#4285F4', width:32, height:32, borderRadius:8}} /><div style={{flex:1, textAlign:'left'}}>Google One</div></button>
          <button className="integration-btn"><div style={{background:'#0078D4', width:32, height:32, borderRadius:8}} /><div style={{flex:1, textAlign:'left'}}>OneDrive</div></button>
        </div>
      </div>

      {/* Profile */}
      <div className={`modal-overlay ${profileOpen ? 'active' : ''}`}>
        <div className="modal-content glass" style={{width:320}}>
          <div className="modal-header">
            <div className="modal-title">Profiles</div>
            <button onClick={() => setProfileOpen(false)}><X size={24} /></button>
          </div>
          {PROFILES.map(p => (
            <button key={p.id} className="integration-btn" style={{background: p.id === profile.id ? 'rgba(249,168,38,0.15)' : ''}} onClick={() => { setProfile(p); setProfileOpen(false); }}>
              <div className="profile-avatar">{p.avatar}</div>
              <div style={{flex:1, textAlign:'left'}}>{p.name}</div>
            </button>
          ))}
          <div style={{display:'flex', gap:8, marginTop:16}}>
            <input type="text" placeholder="New profile..." value={newName} onChange={e => setNewName(e.target.value)} style={{flex:1, background:'rgba(0,0,0,0.3)', border:'none', padding:8, color:'white', borderRadius:8}} />
            <button className="integration-btn" style={{justifyContent:'center', color:'var(--primary)'}} onClick={() => { if (newName.trim()) { PROFILES.push({id:Date.now(), name:newName, avatar:newName[0].toUpperCase()}); setNewName(''); setProfileOpen(false); } }}><Plus size={18} /></button>
          </div>
        </div>
      </div>

    </div>
  );
}

export default App;

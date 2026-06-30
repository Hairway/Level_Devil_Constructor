import { useState, useEffect } from 'react';
import { GameConfig, EditorTool, ActiveRun, AnalyticsEvent } from './types';
import LevelDevilGame from './components/LevelDevilGame';
import {
  Play,
  RotateCcw,
  Copy,
  Sliders,
  Terminal,
  Trash2,
  Plus,
  Gamepad2,
  ChevronRight,
  Sparkles,
  Download,
  Info,
  Wrench,
  CheckCircle2,
  Check
} from 'lucide-react';

const DEFAULT_CONFIG: GameConfig = {
  playerSpeed: 3.5,
  jumpForce: 11,
  gravity: 0.7,
  doorBaseSpeed: 2.5,
  doorAccelSpeed: 6.0,
  doorHoming: 0.25,
  triggerDistance: 260,
  skipButtonDelay: 1.8,
  spikes: [300, 420, 540],
  playerSpawnX: 90,
  doorSpawnX: 720
};

export default function App() {
  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG);
  const [activeRun, setActiveRun] = useState<ActiveRun>(1);
  const [currentTool, setCurrentTool] = useState<EditorTool>('view');
  const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [logs, setLogs] = useState<AnalyticsEvent[]>([
    {
      id: 'init',
      timestamp: new Date().toLocaleTimeString(),
      type: 'SYSTEM',
      description: 'Playable Environment Initialized Successfully'
    }
  ]);
  const [jsonText, setJsonText] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isJsonValid, setIsJsonValid] = useState(true);

  // Keep JSON Textarea in sync with config state
  useEffect(() => {
    setJsonText(JSON.stringify(config, null, 2));
  }, [config]);

  const addLog = (type: string, description: string) => {
    const newEvent: AnalyticsEvent = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      type,
      description
    };
    setLogs(prev => [newEvent, ...prev].slice(0, 100)); // Keep last 100 events
  };

  const handleConfigChange = (newConfig: GameConfig) => {
    setConfig(newConfig);
  };

  const handleJsonInputChange = (text: string) => {
    setJsonText(text);
    try {
      const parsed = JSON.parse(text);
      // Validate schema
      if (
        typeof parsed.playerSpeed === 'number' &&
        typeof parsed.jumpForce === 'number' &&
        typeof parsed.gravity === 'number' &&
        Array.isArray(parsed.spikes)
      ) {
        // Merge over defaults so older configs (missing newer fields) still work.
        setConfig({ ...DEFAULT_CONFIG, ...parsed });
        setIsJsonValid(true);
      } else {
        setIsJsonValid(false);
      }
    } catch {
      setIsJsonValid(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setCopied(true);
    addLog('SYSTEM', 'Config copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const resetToDefault = () => {
    setConfig(DEFAULT_CONFIG);
    addLog('SYSTEM', 'Reset configurations to default presets');
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      
      {/* LEFT CONTENT: Interactive Game Panel */}
      <div className="flex-1 flex flex-col p-4 xl:p-6 justify-between border-b lg:border-b-0 lg:border-r border-zinc-800 bg-zinc-900/40">
        
        {/* Header Title bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-500 border border-amber-500/30">
                Playable Ad Studio
              </span>
              <span className="text-zinc-500 text-xs font-mono">• v1.4.0</span>
            </div>
            <h1 className="text-2xl font-bold font-display tracking-tight text-zinc-100 mt-1">
              Level Devil <span className="text-amber-500 font-light">Playground</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Interactive level simulator, playable scenario designer, and real-time behavioral sandbox
            </p>
          </div>

          {/* Quick preset triggers */}
          <div className="flex items-center gap-1.5 bg-zinc-950/80 p-1 border border-zinc-800 rounded-lg">
            <button
              onClick={() => {
                setActiveRun(1);
                addLog('PRESET', 'Selected Scene Run 1: Spike Gate Chase');
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                activeRun === 1
                  ? 'bg-amber-500 text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>Run 1</span>
            </button>
            <button
              onClick={() => {
                setActiveRun(2);
                addLog('PRESET', 'Selected Scene Run 2: Fake Skip Trap');
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                activeRun === 2
                  ? 'bg-amber-500 text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Run 2</span>
            </button>
            <button
              onClick={() => {
                setActiveRun(3);
                addLog('PRESET', 'Selected Scene Run 3: Green Choice / CTA');
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                activeRun === 3
                  ? 'bg-amber-500 text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Run 3</span>
            </button>
          </div>
        </div>

        {/* PIXI Game canvas viewport */}
        <div className="flex justify-center my-auto py-2">
          <LevelDevilGame
            config={config}
            activeRun={activeRun}
            currentTool={currentTool}
            orientation={orientation}
            onConfigChange={handleConfigChange}
            onLogEvent={addLog}
            onRunComplete={(nextRun) => {
              setActiveRun(nextRun);
              addLog('PROGRESS', `Advancing auto-flow to Run Scenario ${nextRun}`);
            }}
            onDeath={() => {
              addLog('SYSTEM', 'Triggered death-shake sequence.');
            }}
          />
        </div>

        {/* DEV TERMINAL / LOGS CARD */}
        <div className="mt-4 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden flex flex-col h-40">
          <div className="bg-zinc-900 px-4 py-2 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-300 font-bold">
                Playable Analytics Event Monitor
              </span>
            </div>
            <button
              onClick={() => setLogs([])}
              className="text-zinc-500 hover:text-zinc-300 text-[10px] font-mono uppercase border border-zinc-800 hover:bg-zinc-900 px-2 py-0.5 rounded transition"
            >
              Clear
            </button>
          </div>
          <div className="p-3 overflow-y-auto flex-1 font-mono text-[11px] space-y-1.5 bg-black/50 select-text">
            {logs.length === 0 ? (
              <div className="text-zinc-600 italic text-center py-4">No events monitored yet. Move player or trigger traps to view log.</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 border-b border-zinc-900/30 pb-1">
                  <span className="text-zinc-500 shrink-0">[{log.timestamp}]</span>
                  <span
                    className={`font-bold shrink-0 px-1 py-0.2 rounded text-[9px] ${
                      log.type === 'DEATH'
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                        : log.type === 'TRAP_ACTIVATE'
                        ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                        : log.type === 'SKIP_CLICK'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : log.type === 'CTA_TRIGGER' || log.type === 'CTA_CLICK'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {log.type}
                  </span>
                  <span className="text-zinc-300 break-all">{log.description}</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* RIGHT SIDEBAR: Editor & Control Panel */}
      <div className="w-full lg:w-[410px] shrink-0 bg-zinc-950 flex flex-col p-4 xl:p-6 overflow-y-auto h-auto lg:h-screen select-none">
        
        {/* Scenario Header */}
        <div className="mb-6 pb-4 border-b border-zinc-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300 font-display">
              Level Editor Dashboard
            </h2>
          </div>
          <button
            onClick={resetToDefault}
            className="text-xs text-zinc-400 hover:text-zinc-200 transition flex items-center gap-1 border border-zinc-800 hover:bg-zinc-900 px-2.5 py-1.5 rounded-lg active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All</span>
          </button>
        </div>

        {/* Playable Orientation Selector */}
        <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-4 mb-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-zinc-500" />
            <span>Playable Orientation</span>
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setOrientation('horizontal');
                addLog('SYSTEM', 'Playable preview switched to Horizontal (Landscape)');
              }}
              className={`py-2 px-3 rounded-lg text-xs font-semibold transition flex flex-col items-center gap-1.5 cursor-pointer ${
                orientation === 'horizontal'
                  ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30 font-bold shadow-sm'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              <div className="w-7 h-4 border-2 border-current rounded-sm opacity-80" />
              <span>Horizontal</span>
            </button>
            <button
              onClick={() => {
                setOrientation('vertical');
                addLog('SYSTEM', 'Playable preview switched to Vertical (Portrait Phone)');
              }}
              className={`py-2 px-3 rounded-lg text-xs font-semibold transition flex flex-col items-center gap-1.5 cursor-pointer ${
                orientation === 'vertical'
                  ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30 font-bold shadow-sm'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              <div className="w-4 h-7 border-2 border-current rounded-sm opacity-80" />
              <span>Vertical</span>
            </button>
          </div>
          <div className="mt-2.5 flex gap-1.5 items-start">
            <Info className="w-3.5 h-3.5 text-amber-500/80 shrink-0 mt-0.5" />
            <p className="text-[10px] text-zinc-400 leading-relaxed">
              {orientation === 'horizontal' 
                ? 'Wide landscape format commonly optimized for mobile and desktop web banner feeds.' 
                : 'Tall portrait ratio optimized for mobile app-install ad inventories and social feeds.'}
            </p>
          </div>
        </div>

        {/* Section: Screen Click Tool Mode */}
        <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-4 mb-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
            <span>Canvas Interactive Tool</span>
            <span className="text-[10px] lowercase text-zinc-500 font-normal">(Click on screen)</span>
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => {
                setCurrentTool('view');
                addLog('TOOL', 'Switched tool to standard simulator/view mode');
              }}
              className={`py-2 px-3 rounded-lg text-xs font-semibold transition flex flex-col items-center gap-1 cursor-pointer ${
                currentTool === 'view'
                  ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30 font-bold shadow-sm'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              <span>Test Mode</span>
            </button>
            <button
              onClick={() => {
                setCurrentTool('spike');
                addLog('TOOL', 'Switched tool to Spike Addition Mode');
              }}
              className={`py-2 px-3 rounded-lg text-xs font-semibold transition flex flex-col items-center gap-1 cursor-pointer ${
                currentTool === 'spike'
                  ? 'bg-red-500/15 text-red-400 border border-red-500/30 font-bold shadow-sm'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Spike</span>
            </button>
            <button
              onClick={() => {
                setCurrentTool('erase');
                addLog('TOOL', 'Switched tool to Spike Removal Mode');
              }}
              className={`py-2 px-3 rounded-lg text-xs font-semibold transition flex flex-col items-center gap-1 cursor-pointer ${
                currentTool === 'erase'
                  ? 'bg-zinc-500/15 text-zinc-300 border border-zinc-500/30 font-bold shadow-sm'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Erase Spike</span>
            </button>
          </div>
          <div className="mt-2.5 flex gap-1.5 items-start">
            <Info className="w-3.5 h-3.5 text-amber-500/80 shrink-0 mt-0.5" />
            <p className="text-[10px] text-zinc-400 leading-relaxed">
              {currentTool === 'view' && 'Play freely on the board using virtual controls or Arrow keys / WASD.'}
              {currentTool === 'spike' && 'Click anywhere inside the orange level corridor to seed a custom triple-spike hazard.'}
              {currentTool === 'erase' && 'Click near any existing spike group inside the orange level corridor to instantly remove it.'}
            </p>
          </div>
        </div>

        {/* Sliders Configuration */}
        <div className="space-y-5">
          
          {/* Section 1: Player Physics Settings */}
          <div className="border border-zinc-900 bg-zinc-900/20 rounded-xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-zinc-500" />
              <span>Hero Physics Constants</span>
            </h3>

            <div className="space-y-4">
              {/* Speed Slider */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-zinc-300 font-medium">Character Run Speed</span>
                  <span className="text-amber-500 font-bold font-mono bg-amber-500/10 px-1.5 rounded text-[11px]">{config.playerSpeed} px/f</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="10"
                  step="0.5"
                  value={config.playerSpeed}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setConfig(prev => ({ ...prev, playerSpeed: val }));
                  }}
                  className="w-full accent-amber-500 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              {/* Jump Force Slider */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-zinc-300 font-medium">Jump Altitude Impulse</span>
                  <span className="text-amber-500 font-bold font-mono bg-amber-500/10 px-1.5 rounded text-[11px]">{config.jumpForce} px/f</span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="18"
                  step="0.5"
                  value={config.jumpForce}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setConfig(prev => ({ ...prev, jumpForce: val }));
                  }}
                  className="w-full accent-amber-500 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              {/* Gravity Slider */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-zinc-300 font-medium">World Gravity Force</span>
                  <span className="text-amber-500 font-bold font-mono bg-amber-500/10 px-1.5 rounded text-[11px]">{config.gravity} px/f²</span>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="1.5"
                  step="0.1"
                  value={config.gravity}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setConfig(prev => ({ ...prev, gravity: val }));
                  }}
                  className="w-full accent-amber-500 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Gate Traps Settings */}
          <div className="border border-zinc-900 bg-zinc-900/20 rounded-xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-zinc-500" />
              <span>Gate & Trap Behaviors</span>
            </h3>

            <div className="space-y-4">
              {/* Initial Chase Speed */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-zinc-300 font-medium">Initial Saw Chase Velocity</span>
                  <span className="text-amber-500 font-bold font-mono bg-amber-500/10 px-1.5 rounded text-[11px]">{config.doorBaseSpeed} px/f</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="6"
                  step="0.1"
                  value={config.doorBaseSpeed}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setConfig(prev => ({ ...prev, doorBaseSpeed: val }));
                  }}
                  className="w-full accent-amber-500 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              {/* Accelerated Speed */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-zinc-300 font-medium">Turbo Saw Pursuit Speed</span>
                  <span className="text-amber-500 font-bold font-mono bg-amber-500/10 px-1.5 rounded text-[11px]">{config.doorAccelSpeed} px/f</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="15"
                  step="0.5"
                  value={config.doorAccelSpeed}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setConfig(prev => ({ ...prev, doorAccelSpeed: val }));
                  }}
                  className="w-full accent-amber-500 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              {/* Door Homing / Inertia */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-zinc-300 font-medium">Door Homing / Inertia</span>
                  <span className="text-amber-500 font-bold font-mono bg-amber-500/10 px-1.5 rounded text-[11px]">{config.doorHoming}</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.6"
                  step="0.05"
                  value={config.doorHoming}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setConfig(prev => ({ ...prev, doorHoming: val }));
                  }}
                  className="w-full accent-amber-500 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                />
                <p className="text-[10px] text-zinc-500 mt-1">Low = lazy, drifts past the player. High = snaps onto the player.</p>
              </div>

              {/* Trigger Distance */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-zinc-300 font-medium">Gate Chase Trigger Proximity</span>
                  <span className="text-amber-500 font-bold font-mono bg-amber-500/10 px-1.5 rounded text-[11px]">{config.triggerDistance} px</span>
                </div>
                <input
                  type="range"
                  min="150"
                  max="450"
                  step="10"
                  value={config.triggerDistance}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setConfig(prev => ({ ...prev, triggerDistance: val }));
                  }}
                  className="w-full accent-amber-500 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              {/* Skip Delay */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-zinc-300 font-medium">Skip Button Render Timeout</span>
                  <span className="text-amber-500 font-bold font-mono bg-amber-500/10 px-1.5 rounded text-[11px]">{config.skipButtonDelay} s</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="5.0"
                  step="0.1"
                  value={config.skipButtonDelay}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setConfig(prev => ({ ...prev, skipButtonDelay: val }));
                  }}
                  className="w-full accent-amber-500 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Spike Coordinates Viewer */}
          <div className="border border-zinc-900 bg-zinc-900/20 rounded-xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
              Spike Placements ({config.spikes.length})
            </h3>
            {config.spikes.length === 0 ? (
              <p className="text-[10px] text-zinc-500 italic">No spikes deployed on the ground floor. Click "+ Add Spike" to place some.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {config.spikes.map((sx, idx) => (
                  <div
                    key={idx}
                    className="bg-zinc-900 border border-zinc-800 px-2 py-1 rounded text-[10px] font-mono flex items-center gap-1 text-zinc-300"
                  >
                    <span>Spike #{idx + 1}:</span>
                    <strong className="text-amber-500">{sx}px</strong>
                    <button
                      onClick={() => {
                        const nextSpikes = config.spikes.filter((_, i) => i !== idx);
                        setConfig(prev => ({ ...prev, spikes: nextSpikes }));
                        addLog('SPIKE_REMOVE', `Removed spike trap at index ${idx + 1}`);
                      }}
                      className="text-zinc-500 hover:text-red-400 pl-1 transition cursor-pointer"
                      title="Delete spike"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Level Layout: spawn positions */}
          <div className="border border-zinc-900 bg-zinc-900/20 rounded-xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4">
              Level Layout
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-zinc-300 font-medium">Player Start Position</span>
                  <span className="text-amber-500 font-bold font-mono bg-amber-500/10 px-1.5 rounded text-[11px]">{config.playerSpawnX} px</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="400"
                  step="5"
                  value={config.playerSpawnX}
                  onChange={(e) => setConfig(prev => ({ ...prev, playerSpawnX: parseInt(e.target.value) }))}
                  className="w-full accent-amber-500 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-zinc-300 font-medium">Door Position</span>
                  <span className="text-amber-500 font-bold font-mono bg-amber-500/10 px-1.5 rounded text-[11px]">{config.doorSpawnX} px</span>
                </div>
                <input
                  type="range"
                  min="400"
                  max="750"
                  step="5"
                  value={config.doorSpawnX}
                  onChange={(e) => setConfig(prev => ({ ...prev, doorSpawnX: parseInt(e.target.value) }))}
                  className="w-full accent-amber-500 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Import/Export Config */}
          <div className="border border-zinc-900 bg-zinc-900/20 rounded-xl p-4 mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center justify-between">
              <span>Interactive JSON Config</span>
              <span className="text-[9px] text-zinc-500 uppercase">Import & Export</span>
            </h3>

            <textarea
              value={jsonText}
              onChange={(e) => handleJsonInputChange(e.target.value)}
              className={`w-full h-32 bg-black border rounded-lg p-2.5 text-[10px] font-mono focus:outline-none focus:ring-1 ${
                isJsonValid
                  ? 'border-zinc-800 text-zinc-300 focus:border-amber-500 focus:ring-amber-500/30'
                  : 'border-red-500 text-red-400 focus:border-red-500 focus:ring-red-500/30'
              }`}
              placeholder="Paste custom level configuration JSON here..."
            />
            
            {!isJsonValid && (
              <p className="text-[10px] text-red-500 font-mono mt-1">
                Invalid GameConfig JSON Schema
              </p>
            )}

            <div className="grid grid-cols-2 gap-2 mt-3">
              <button
                onClick={copyToClipboard}
                className="py-2 px-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Config'}</span>
              </button>
              
              <a
                href={`data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(config, null, 2))}`}
                download="level-devil-config.json"
                className="py-2 px-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 text-center cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </a>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

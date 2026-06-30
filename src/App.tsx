import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AnalyticsEvent,
  EditorMode,
  EditorTool,
  GameConfig,
  LevelObject,
  PlayableProject,
  PlayableRun,
  TrapObjectType,
  TriggerZone,
} from './types';
import LevelDevilGame from './components/LevelDevilGame';
import { generateStandalonePlayable } from './exportPlayable';
import {
  ArrowDown,
  ArrowUp,
  Boxes,
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileCode2,
  Gamepad2,
  GitBranch,
  Layers,
  Link2,
  MousePointer2,
  Plus,
  RotateCcw,
  Sliders,
  Terminal,
  Trash2,
} from 'lucide-react';

const makeId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
const STORAGE_KEY = 'level-devil-constructor-state-v2';

const objectCatalog: Array<{
  type: TrapObjectType;
  label: string;
  width: number;
  height: number;
  y: number;
  initiallyActive: boolean;
}> = [
  { type: 'spike', label: 'Spike', width: 30, height: 22, y: 281, initiallyActive: true },
  { type: 'saw', label: 'Saw', width: 36, height: 36, y: 244, initiallyActive: false },
  { type: 'pit', label: 'Opening Pit', width: 90, height: 42, y: 281, initiallyActive: false },
  { type: 'fallingBlock', label: 'Falling Block', width: 54, height: 44, y: 84, initiallyActive: false },
  { type: 'crusher', label: 'Crusher', width: 58, height: 96, y: 160, initiallyActive: false },
  { type: 'laser', label: 'Laser Beam', width: 130, height: 14, y: 212, initiallyActive: false },
];

const objectPreset = (type: TrapObjectType) =>
  objectCatalog.find((item) => item.type === type) || objectCatalog[0];

const baseObjects = (): LevelObject[] => [
  {
    id: 'spike-a',
    type: 'spike',
    x: 300,
    y: 281,
    width: 30,
    height: 22,
    label: 'First spike',
    initiallyActive: true,
  },
  {
    id: 'spike-b',
    type: 'spike',
    x: 420,
    y: 281,
    width: 30,
    height: 22,
    label: 'Second spike',
    initiallyActive: true,
  },
  {
    id: 'pit-a',
    type: 'pit',
    x: 520,
    y: 281,
    width: 90,
    height: 42,
    label: 'Opening pit',
    initiallyActive: false,
  },
  {
    id: 'saw-a',
    type: 'saw',
    x: 650,
    y: 244,
    width: 36,
    height: 36,
    label: 'Hidden saw',
    initiallyActive: false,
  },
  {
    id: 'falling-block-a',
    type: 'fallingBlock',
    x: 570,
    y: 84,
    width: 54,
    height: 44,
    label: 'Falling block',
    initiallyActive: false,
  },
  {
    id: 'laser-a',
    type: 'laser',
    x: 570,
    y: 212,
    width: 130,
    height: 14,
    label: 'Laser beam',
    initiallyActive: false,
  },
];

const baseTriggers = (): TriggerZone[] => [
  {
    id: 'door-trigger',
    x: 500,
    y: 170,
    width: 80,
    height: 110,
    targetId: 'door',
    action: 'startDoorChase',
    label: 'Door chase trigger',
  },
  {
    id: 'pit-trigger',
    x: 380,
    y: 170,
    width: 70,
    height: 110,
    targetId: 'pit-a',
    action: 'openPit',
    label: 'Pit trigger',
  },
  {
    id: 'block-trigger',
    x: 610,
    y: 170,
    width: 60,
    height: 110,
    targetId: 'falling-block-a',
    action: 'activate',
    label: 'Falling block trigger',
  },
];

const createDefaultConfig = (): GameConfig => {
  const objects = baseObjects();
  return {
    playerSpeed: 3.5,
    jumpForce: 11,
    gravity: 0.7,
    doorBaseSpeed: 2.5,
    doorAccelSpeed: 6,
    doorHoming: 0.25,
    triggerDistance: 260,
    skipButtonDelay: 1.8,
    spikes: objects.filter((object) => object.type === 'spike').map((object) => object.x),
    playerSpawnX: 90,
    doorSpawnX: 720,
    objects,
    triggers: baseTriggers(),
  };
};

const cloneConfig = (config: GameConfig): GameConfig => ({
  ...config,
  spikes: [...config.spikes],
  objects: config.objects.map((object) => ({ ...object })),
  triggers: config.triggers.map((trigger) => ({ ...trigger })),
});

const normalizeConfig = (raw: Partial<GameConfig>): GameConfig => {
  const defaults = createDefaultConfig();
  const objects = Array.isArray(raw.objects) && raw.objects.length > 0
    ? raw.objects.map((object) => ({ ...object }))
    : (Array.isArray(raw.spikes) ? raw.spikes : defaults.spikes).map((x, index) => ({
        id: `spike-${index + 1}`,
        type: 'spike' as const,
        x,
        y: 281,
        width: 30,
        height: 22,
        label: `Spike ${index + 1}`,
        initiallyActive: true,
      }));

  return {
    ...defaults,
    ...raw,
    spikes: objects.filter((object) => object.type === 'spike').map((object) => object.x),
    objects,
    triggers: Array.isArray(raw.triggers) ? raw.triggers.map((trigger) => ({ ...trigger })) : defaults.triggers,
  };
};

const createRun = (name: string, config = createDefaultConfig()): PlayableRun => ({
  id: makeId('run'),
  name,
  config: cloneConfig(config),
});

const createInitialProject = (): PlayableProject => {
  const run1 = createRun('Run 1 - Door Chase', createDefaultConfig());
  const run2Config = cloneConfig(run1.config);
  run2Config.triggers = run2Config.triggers.filter((trigger) => trigger.id !== 'door-trigger');
  const run2 = createRun('Run 2 - Skip Trap', run2Config);
  const run3Config = cloneConfig(run1.config);
  run3Config.triggers = [];
  run3Config.objects = run3Config.objects.map((object) => ({ ...object, initiallyActive: object.type === 'spike' }));
  const run3 = createRun('Run 3 - Safe Door CTA', run3Config);

  return {
    id: 'level-devil-play001-01',
    name: 'Level_Devil_play001_01',
    runs: [run1, run2, run3],
  };
};

const normalizeProject = (raw: Partial<PlayableProject>, index = 0): PlayableProject => ({
  id: raw.id || makeId('playable'),
  name: raw.name || `Level_Devil_play${String(index + 1).padStart(3, '0')}_01`,
  runs: Array.isArray(raw.runs) && raw.runs.length > 0
    ? raw.runs.map((run, runIndex) => ({
        id: run.id || makeId('run'),
        name: run.name || `Run ${runIndex + 1}`,
        config: normalizeConfig(run.config || {}),
      }))
    : [createRun('Run 1', createDefaultConfig())],
});

const loadSavedProjects = (): PlayableProject[] => {
  if (typeof window === 'undefined') return [createInitialProject()];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [createInitialProject()];
    const parsed = JSON.parse(raw) as Partial<PlayableProject>[] | Partial<PlayableProject>;
    const projects = Array.isArray(parsed) ? parsed.map(normalizeProject) : [normalizeProject(parsed)];
    return projects.length > 0 ? projects : [createInitialProject()];
  } catch {
    return [createInitialProject()];
  }
};

const selectedObjectLabel = (config: GameConfig, id: string | null) => {
  if (!id) return 'Nothing selected';
  if (id === 'playerSpawn') return 'Player Spawn';
  if (id === 'door') return 'Door';
  return config.objects.find((object) => object.id === id)?.label ||
    config.triggers.find((trigger) => trigger.id === id)?.label ||
    id;
};

const triggerTargetLabel = (config: GameConfig, trigger: TriggerZone) => {
  if (trigger.targetId === 'door') return 'Door';
  return config.objects.find((object) => object.id === trigger.targetId)?.label || trigger.targetId;
};

export default function App() {
  const [projects, setProjects] = useState<PlayableProject[]>(loadSavedProjects);
  const [activeProjectIndex, setActiveProjectIndex] = useState(0);
  const [activeRunIndex, setActiveRunIndex] = useState(0);
  const [copySourceRunIndex, setCopySourceRunIndex] = useState(0);
  const [editorMode, setEditorMode] = useState<EditorMode>('constructor');
  const [currentTool, setCurrentTool] = useState<EditorTool>('select');
  const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [showTriggers, setShowTriggers] = useState(true);
  const [showConnectors, setShowConnectors] = useState(true);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [jsonText, setJsonText] = useState('');
  const [isJsonValid, setIsJsonValid] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [logs, setLogs] = useState<AnalyticsEvent[]>([
    {
      id: 'init',
      timestamp: new Date().toLocaleTimeString(),
      type: 'SYSTEM',
      description: 'Constructor initialized',
    },
  ]);

  const activeProject = projects[activeProjectIndex] || projects[0];
  const activeRun = activeProject.runs[activeRunIndex] || activeProject.runs[0];
  const config = activeRun.config;

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    if (activeProjectIndex >= projects.length) {
      setActiveProjectIndex(Math.max(0, projects.length - 1));
      setActiveRunIndex(0);
      setSelectedEntityId(null);
    }
  }, [activeProjectIndex, projects.length]);

  useEffect(() => {
    const runCount = projects[activeProjectIndex]?.runs.length || 0;
    if (runCount > 0 && activeRunIndex >= runCount) {
      setActiveRunIndex(runCount - 1);
      setSelectedEntityId(null);
    }
    if (runCount > 0 && copySourceRunIndex >= runCount) {
      setCopySourceRunIndex(runCount - 1);
    }
  }, [activeProjectIndex, activeRunIndex, copySourceRunIndex, projects]);

  useEffect(() => {
    setJsonText(JSON.stringify(activeProject, null, 2));
  }, [activeProject]);

  const addLog = useCallback((type: string, description: string) => {
    const newEvent: AnalyticsEvent = {
      id: Math.random().toString(36).slice(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      type,
      description,
    };
    setLogs((prev) => [newEvent, ...prev].slice(0, 100));
  }, []);

  const updateActiveConfig = (nextConfig: GameConfig) => {
    const normalized = normalizeConfig(nextConfig);
    setProjects((prev) => prev.map((project, projectIndex) => {
      if (projectIndex !== activeProjectIndex) return project;
      return {
        ...project,
        runs: project.runs.map((run, runIndex) =>
          runIndex === activeRunIndex ? { ...run, config: normalized } : run,
        ),
      };
    }));
  };

  const setActiveProjectSafe = (index: number) => {
    setActiveProjectIndex(index);
    setActiveRunIndex(0);
    setCopySourceRunIndex(0);
    setSelectedEntityId(null);
  };

  const renameActiveProject = (name: string) => {
    setProjects((prev) => prev.map((project, projectIndex) =>
      projectIndex === activeProjectIndex ? { ...project, name } : project,
    ));
  };

  const renameActiveRun = (name: string) => {
    setProjects((prev) => prev.map((project, projectIndex) => {
      if (projectIndex !== activeProjectIndex) return project;
      return {
        ...project,
        runs: project.runs.map((run, runIndex) => runIndex === activeRunIndex ? { ...run, name } : run),
      };
    }));
  };

  const addPlayable = () => {
    setProjects((prev) => [
      ...prev,
      {
        id: makeId('playable'),
        name: `Level_Devil_play${String(prev.length + 1).padStart(3, '0')}_01`,
        runs: [createRun('Run 1', createDefaultConfig())],
      },
    ]);
    setActiveProjectIndex(projects.length);
    setActiveRunIndex(0);
    setCopySourceRunIndex(0);
    addLog('PROJECT', 'Created new playable iteration');
  };

  const duplicatePlayable = () => {
    const source = activeProject;
    const copy: PlayableProject = {
      id: makeId('playable'),
      name: `${source.name}_copy`,
      runs: source.runs.map((run, index) => ({
        id: makeId('run'),
        name: `${run.name} Copy ${index + 1}`,
        config: cloneConfig(run.config),
      })),
    };
    setProjects((prev) => [...prev, copy]);
    setActiveProjectIndex(projects.length);
    setActiveRunIndex(0);
    setCopySourceRunIndex(0);
    addLog('PROJECT', `Duplicated playable ${source.name}`);
  };

  const deleteActivePlayable = () => {
    if (projects.length <= 1) return;
    const removed = activeProject.name;
    setProjects((prev) => prev.filter((_, index) => index !== activeProjectIndex));
    setActiveProjectIndex(Math.max(0, activeProjectIndex - 1));
    setActiveRunIndex(0);
    setCopySourceRunIndex(0);
    setSelectedEntityId(null);
    addLog('PROJECT_DELETE', `Deleted playable ${removed}`);
  };

  const addRun = (copyCurrent = false, sourceRunIndex = activeRunIndex) => {
    const sourceRun = activeProject.runs[sourceRunIndex] || activeRun;
    const sourceConfig = copyCurrent ? sourceRun.config : createDefaultConfig();
    const nextRun = createRun(`Run ${activeProject.runs.length + 1}`, sourceConfig);
    setProjects((prev) => prev.map((project, projectIndex) => {
      if (projectIndex !== activeProjectIndex) return project;
      return { ...project, runs: [...project.runs, nextRun] };
    }));
    setActiveRunIndex(activeProject.runs.length);
    setCopySourceRunIndex(activeProject.runs.length);
    setSelectedEntityId(null);
    addLog('RUN', copyCurrent ? `Copied ${sourceRun.name}` : 'Created empty run');
  };

  const deleteActiveRun = () => {
    if (activeProject.runs.length <= 1) return;
    const removed = activeRun.name;
    const nextRunIndex = Math.max(0, activeRunIndex - 1);
    setProjects((prev) => prev.map((project, projectIndex) => {
      if (projectIndex !== activeProjectIndex) return project;
      return { ...project, runs: project.runs.filter((_, runIndex) => runIndex !== activeRunIndex) };
    }));
    setActiveRunIndex(nextRunIndex);
    setCopySourceRunIndex(Math.min(copySourceRunIndex, activeProject.runs.length - 2));
    setSelectedEntityId(null);
    addLog('RUN_DELETE', `Deleted ${removed}`);
  };

  const moveActiveRun = (direction: -1 | 1) => {
    const targetIndex = activeRunIndex + direction;
    if (targetIndex < 0 || targetIndex >= activeProject.runs.length) return;
    setProjects((prev) => prev.map((project, projectIndex) => {
      if (projectIndex !== activeProjectIndex) return project;
      const runs = [...project.runs];
      [runs[activeRunIndex], runs[targetIndex]] = [runs[targetIndex], runs[activeRunIndex]];
      return { ...project, runs };
    }));
    setActiveRunIndex(targetIndex);
    setCopySourceRunIndex(targetIndex);
    setSelectedEntityId(null);
    addLog('RUN_REORDER', `Moved run to position ${targetIndex + 1}`);
  };

  const deleteSelected = () => {
    if (!selectedEntityId || selectedEntityId === 'playerSpawn' || selectedEntityId === 'door') return;
    const next = cloneConfig(config);
    next.objects = next.objects.filter((object) => object.id !== selectedEntityId);
    next.triggers = next.triggers.filter((trigger) => trigger.id !== selectedEntityId && trigger.targetId !== selectedEntityId);
    updateActiveConfig(next);
    setSelectedEntityId(null);
  };

  const updateSelectedObject = (patch: Partial<LevelObject>) => {
    if (!selectedEntityId) return;
    const next = cloneConfig(config);
    next.objects = next.objects.map((object) => object.id === selectedEntityId ? { ...object, ...patch } : object);
    updateActiveConfig(next);
  };

  const updateSelectedTrigger = (patch: Partial<TriggerZone>) => {
    if (!selectedEntityId) return;
    const next = cloneConfig(config);
    next.triggers = next.triggers.map((trigger) => trigger.id === selectedEntityId ? { ...trigger, ...patch } : trigger);
    updateActiveConfig(next);
  };

  const duplicateSelected = () => {
    if (!selectedEntityId || selectedEntityId === 'playerSpawn' || selectedEntityId === 'door') return;
    const next = cloneConfig(config);
    const sourceObject = next.objects.find((object) => object.id === selectedEntityId);
    if (sourceObject) {
      const copy = {
        ...sourceObject,
        id: makeId(sourceObject.type),
        label: `${sourceObject.label} Copy`,
        x: Math.min(sourceObject.x + 36, 760),
      };
      next.objects.push(copy);
      updateActiveConfig(next);
      setSelectedEntityId(copy.id);
      addLog('OBJECT_COPY', `Copied ${sourceObject.label}`);
      return;
    }

    const sourceTrigger = next.triggers.find((trigger) => trigger.id === selectedEntityId);
    if (sourceTrigger) {
      const copy = {
        ...sourceTrigger,
        id: makeId('trigger'),
        label: `${sourceTrigger.label} Copy`,
        x: Math.min(sourceTrigger.x + 36, 720),
      };
      next.triggers.push(copy);
      updateActiveConfig(next);
      setSelectedEntityId(copy.id);
      addLog('TRIGGER_COPY', `Copied ${sourceTrigger.label}`);
    }
  };

  const updateSpecialSelectionX = (value: number) => {
    const x = Math.round(value);
    if (selectedEntityId === 'playerSpawn') updateActiveConfig({ ...config, playerSpawnX: x });
    if (selectedEntityId === 'door') updateActiveConfig({ ...config, doorSpawnX: x });
  };

  const handleJsonInputChange = (text: string) => {
    setJsonText(text);
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed.runs)) {
        const project: PlayableProject = {
          id: parsed.id || makeId('playable'),
          name: parsed.name || 'Imported Playable',
          runs: parsed.runs.map((run: Partial<PlayableRun>, index: number) => ({
            id: run.id || makeId('run'),
            name: run.name || `Run ${index + 1}`,
            config: normalizeConfig(run.config || {}),
          })),
        };
        setProjects((prev) => prev.map((item, index) => index === activeProjectIndex ? project : item));
      } else {
        updateActiveConfig(normalizeConfig(parsed));
      }
      setIsJsonValid(true);
    } catch {
      setIsJsonValid(false);
    }
  };

  const copyText = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1600);
  };

  const standalonePlayable = useMemo(() => generateStandalonePlayable(activeProject), [activeProject]);
  const selectedObject = config.objects.find((object) => object.id === selectedEntityId);
  const selectedTrigger = config.triggers.find((trigger) => trigger.id === selectedEntityId);
  const linkedTriggers = selectedObject ? config.triggers.filter((trigger) => trigger.targetId === selectedObject.id) : [];
  const selectedSpecialX = selectedEntityId === 'playerSpawn'
    ? config.playerSpawnX
    : selectedEntityId === 'door'
      ? config.doorSpawnX
      : null;
  const numberClass = 'w-full bg-black border border-zinc-800 rounded px-2 py-1.5 text-zinc-300 font-mono';

  const NumberField = ({ label, value, min, max, step = 1, onChange }: {
    label: string;
    value: number;
    min?: number;
    max?: number;
    step?: number;
    onChange: (value: number) => void;
  }) => (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1 block">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className={numberClass}
      />
    </label>
  );

  const toolButtons: Array<{ id: EditorTool; label: string }> = [
    { id: 'select', label: 'Select' },
    ...objectCatalog.map((item) => ({ id: item.type, label: item.label })),
    { id: 'trigger', label: 'Trigger' },
    { id: 'erase', label: 'Erase' },
  ];

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <div className="flex-1 flex flex-col p-4 xl:p-6 border-b lg:border-b-0 lg:border-r border-zinc-800 bg-zinc-900/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-500 border border-amber-500/30">
                Playable Constructor
              </span>
              <span className="text-zinc-500 text-xs font-mono">v2.0</span>
              <span className="text-emerald-400 text-[10px] font-mono uppercase">Autosaved</span>
            </div>
            <h1 className="text-2xl font-bold font-display tracking-tight text-zinc-100 mt-1">
              {activeProject.name}
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              {activeRun.name} - {editorMode === 'constructor' ? 'edit objects, triggers, and links' : 'play the playable flow'}
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-950/80 p-1 border border-zinc-800 rounded-lg">
            <button
              onClick={() => setEditorMode('play')}
              className={`px-3 py-2 rounded-md text-xs font-bold transition flex items-center gap-1 cursor-pointer ${editorMode === 'play' ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'}`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>Play</span>
            </button>
            <button
              onClick={() => setEditorMode('constructor')}
              className={`px-3 py-2 rounded-md text-xs font-bold transition flex items-center gap-1 cursor-pointer ${editorMode === 'constructor' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'}`}
            >
              <MousePointer2 className="w-3.5 h-3.5" />
              <span>Constructor</span>
            </button>
          </div>
        </div>

        <div className="flex justify-center my-auto py-2">
          <LevelDevilGame
            config={config}
            activeRun={activeRunIndex + 1}
            editorMode={editorMode}
            currentTool={currentTool}
            orientation={orientation}
            selectedEntityId={selectedEntityId}
            showTriggers={showTriggers}
            showConnectors={showConnectors}
            onConfigChange={updateActiveConfig}
            onSelectEntity={setSelectedEntityId}
            onLogEvent={addLog}
            onRunComplete={(nextRun) => {
              setActiveRunIndex(Math.min(nextRun - 1, activeProject.runs.length - 1));
              addLog('PROGRESS', `Advanced to Run ${nextRun}`);
            }}
            onDeath={() => addLog('SYSTEM', 'Death animation triggered')}
          />
        </div>

        <div className="mt-4 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden flex flex-col h-40">
          <div className="bg-zinc-900 px-4 py-2 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-300 font-bold">
                Event Monitor
              </span>
            </div>
            <button onClick={() => setLogs([])} className="text-zinc-500 hover:text-zinc-300 text-[10px] font-mono uppercase border border-zinc-800 hover:bg-zinc-900 px-2 py-0.5 rounded transition">
              Clear
            </button>
          </div>
          <div className="p-3 overflow-y-auto flex-1 font-mono text-[11px] space-y-1.5 bg-black/50 select-text">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 border-b border-zinc-900/30 pb-1">
                <span className="text-zinc-500 shrink-0">[{log.timestamp}]</span>
                <span className="font-bold shrink-0 px-1 rounded text-[9px] bg-zinc-800 text-zinc-400">{log.type}</span>
                <span className="text-zinc-300 break-all">{log.description}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full lg:w-[430px] shrink-0 bg-zinc-950 flex flex-col p-4 xl:p-6 overflow-y-auto h-auto lg:h-screen select-none">
        <div className="mb-5 pb-4 border-b border-zinc-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Boxes className="w-5 h-5 text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300 font-display">
              Constructor
            </h2>
          </div>
          <button
            onClick={() => updateActiveConfig(createDefaultConfig())}
            className="text-xs text-zinc-400 hover:text-zinc-200 transition flex items-center gap-1 border border-zinc-800 hover:bg-zinc-900 px-2.5 py-1.5 rounded-lg active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Run</span>
          </button>
        </div>

        <div className="space-y-4">
          <section className="border border-zinc-900 bg-zinc-900/30 rounded-xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5" />
              Playables
            </h3>
            <input
              value={activeProject.name}
              onChange={(e) => renameActiveProject(e.target.value)}
              className="w-full mb-3 bg-black border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-300"
            />
            <div className="space-y-2">
              {projects.map((project, index) => (
                <button
                  key={project.id}
                  onClick={() => setActiveProjectSafe(index)}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-xs cursor-pointer ${index === activeProjectIndex ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
                >
                  {project.name}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <button onClick={addPlayable} className="py-2 px-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer">
                <Plus className="w-3.5 h-3.5" />
                New
              </button>
              <button onClick={duplicatePlayable} className="py-2 px-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer">
                <Copy className="w-3.5 h-3.5" />
                Copy
              </button>
              <button
                onClick={deleteActivePlayable}
                disabled={projects.length <= 1}
                className="py-2 px-3 bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 disabled:opacity-35 disabled:hover:bg-red-500/10 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          </section>

          <section className="border border-zinc-900 bg-zinc-900/30 rounded-xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
              <GitBranch className="w-3.5 h-3.5" />
              Runs
            </h3>
            <input
              value={activeRun.name}
              onChange={(e) => renameActiveRun(e.target.value)}
              className="w-full mb-3 bg-black border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-300"
            />
            <div className="grid grid-cols-3 gap-2">
              {activeProject.runs.map((run, index) => (
                <button
                  key={run.id}
                  onClick={() => {
                    setActiveRunIndex(index);
                    setSelectedEntityId(null);
                  }}
                  className={`py-2 px-2 rounded-lg text-xs font-semibold border cursor-pointer ${index === activeRunIndex ? 'bg-amber-500 text-zinc-950 border-amber-400' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
                >
                  Run {index + 1}
                </button>
              ))}
            </div>
            <label className="block mt-3">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1 block">Copy source</span>
              <select
                value={copySourceRunIndex}
                onChange={(e) => setCopySourceRunIndex(Number(e.target.value))}
                className="w-full bg-black border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-300"
              >
                {activeProject.runs.map((run, index) => (
                  <option key={run.id} value={index}>{`Run ${index + 1} - ${run.name}`}</option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button onClick={() => addRun(false)} className="py-2 px-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer">
                <Plus className="w-3.5 h-3.5" />
                Empty Run
              </button>
              <button onClick={() => addRun(true, copySourceRunIndex)} className="py-2 px-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer">
                <Copy className="w-3.5 h-3.5" />
                Copy Run
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <button
                onClick={() => moveActiveRun(-1)}
                disabled={activeRunIndex === 0}
                className="py-2 px-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 disabled:opacity-35 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
              >
                <ArrowUp className="w-3.5 h-3.5" />
                Up
              </button>
              <button
                onClick={() => moveActiveRun(1)}
                disabled={activeRunIndex === activeProject.runs.length - 1}
                className="py-2 px-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 disabled:opacity-35 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
              >
                <ArrowDown className="w-3.5 h-3.5" />
                Down
              </button>
              <button
                onClick={deleteActiveRun}
                disabled={activeProject.runs.length <= 1}
                className="py-2 px-2 bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 disabled:opacity-35 disabled:hover:bg-red-500/10 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          </section>

          <section className="border border-zinc-900 bg-zinc-900/30 rounded-xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
              <MousePointer2 className="w-3.5 h-3.5" />
              Tools
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {toolButtons.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => {
                    setEditorMode('constructor');
                    setCurrentTool(tool.id);
                  }}
                  className={`py-2 px-2 rounded-lg text-xs font-semibold border cursor-pointer ${currentTool === tool.id ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
                >
                  {tool.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button onClick={() => setShowTriggers((v) => !v)} className="py-2 px-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer">
                {showTriggers ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                Triggers
              </button>
              <button onClick={() => setShowConnectors((v) => !v)} className="py-2 px-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer">
                <Link2 className="w-3.5 h-3.5" />
                Links
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                onClick={() => setOrientation('vertical')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border cursor-pointer ${orientation === 'vertical' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
              >
                9:16
              </button>
              <button
                onClick={() => setOrientation('horizontal')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border cursor-pointer ${orientation === 'horizontal' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
              >
                16:9
              </button>
            </div>
          </section>

          <section className="border border-zinc-900 bg-zinc-900/30 rounded-xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
              Selected: <span className="text-amber-400">{selectedObjectLabel(config, selectedEntityId)}</span>
            </h3>
            {selectedObject && (
              <div className="space-y-3 text-xs">
                <input value={selectedObject.label} onChange={(e) => updateSelectedObject({ label: e.target.value })} className="w-full bg-black border border-zinc-800 rounded px-2 py-1.5 text-zinc-300" />
                <select
                  value={selectedObject.type}
                  onChange={(e) => {
                    const type = e.target.value as TrapObjectType;
                    const preset = objectPreset(type);
                    updateSelectedObject({
                      type,
                      width: preset.width,
                      height: preset.height,
                      y: preset.y,
                      initiallyActive: preset.initiallyActive,
                    });
                  }}
                  className="w-full bg-black border border-zinc-800 rounded px-2 py-1.5 text-zinc-300"
                >
                  {objectCatalog.map((item) => <option key={item.type} value={item.type}>{item.label}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <NumberField label="X" value={selectedObject.x} min={0} max={800} onChange={(x) => updateSelectedObject({ x })} />
                  <NumberField label="Y" value={selectedObject.y} min={0} max={328} onChange={(y) => updateSelectedObject({ y })} />
                  <NumberField label="Width" value={selectedObject.width} min={8} max={240} onChange={(width) => updateSelectedObject({ width })} />
                  <NumberField label="Height" value={selectedObject.height} min={8} max={180} onChange={(height) => updateSelectedObject({ height })} />
                </div>
                <label className="flex items-center gap-2 text-zinc-400">
                  <input type="checkbox" checked={selectedObject.initiallyActive} onChange={(e) => updateSelectedObject({ initiallyActive: e.target.checked })} />
                  Active on start
                </label>
                <div className="rounded-lg border border-zinc-800 bg-black/40 p-2">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Linked triggers</div>
                  {linkedTriggers.length > 0 ? (
                    <div className="space-y-1.5">
                      {linkedTriggers.map((trigger) => (
                        <button
                          key={trigger.id}
                          onClick={() => setSelectedEntityId(trigger.id)}
                          className="w-full text-left px-2 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 cursor-pointer"
                        >
                          {trigger.label} - {trigger.action}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-zinc-600">No trigger linked to this object yet.</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={duplicateSelected} className="py-2 px-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer">
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </button>
                  <button onClick={deleteSelected} className="py-2 px-3 bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            )}
            {selectedTrigger && (
              <div className="space-y-3 text-xs">
                <input value={selectedTrigger.label} onChange={(e) => updateSelectedTrigger({ label: e.target.value })} className="w-full bg-black border border-zinc-800 rounded px-2 py-1.5 text-zinc-300" />
                <div className="grid grid-cols-2 gap-2">
                  <NumberField label="X" value={selectedTrigger.x} min={0} max={800} onChange={(x) => updateSelectedTrigger({ x })} />
                  <NumberField label="Y" value={selectedTrigger.y} min={0} max={328} onChange={(y) => updateSelectedTrigger({ y })} />
                  <NumberField label="Width" value={selectedTrigger.width} min={10} max={260} onChange={(width) => updateSelectedTrigger({ width })} />
                  <NumberField label="Height" value={selectedTrigger.height} min={10} max={260} onChange={(height) => updateSelectedTrigger({ height })} />
                </div>
                <select value={selectedTrigger.action} onChange={(e) => updateSelectedTrigger({ action: e.target.value as TriggerZone['action'] })} className="w-full bg-black border border-zinc-800 rounded px-2 py-1.5 text-zinc-300">
                  <option value="activate">Activate object</option>
                  <option value="openPit">Open pit</option>
                  <option value="startDoorChase">Start door chase</option>
                </select>
                <select value={selectedTrigger.targetId} onChange={(e) => updateSelectedTrigger({ targetId: e.target.value })} className="w-full bg-black border border-zinc-800 rounded px-2 py-1.5 text-zinc-300">
                  <option value="door">Door</option>
                  {config.objects.map((object) => <option key={object.id} value={object.id}>{object.label}</option>)}
                </select>
                <div className="rounded-lg border border-zinc-800 bg-black/40 p-2">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Linked target</div>
                  <button
                    onClick={() => setSelectedEntityId(selectedTrigger.targetId)}
                    className="w-full text-left px-2 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 cursor-pointer"
                  >
                    {triggerTargetLabel(config, selectedTrigger)}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={duplicateSelected} className="py-2 px-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer">
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </button>
                  <button onClick={deleteSelected} className="py-2 px-3 bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            )}
            {selectedSpecialX !== null && (
              <div className="space-y-3 text-xs">
                <NumberField label="X position" value={selectedSpecialX} min={20} max={780} onChange={updateSpecialSelectionX} />
                <p className="text-[10px] text-zinc-500">Drag it on the level or set the exact X position here.</p>
              </div>
            )}
            {!selectedObject && !selectedTrigger && selectedEntityId !== 'playerSpawn' && selectedEntityId !== 'door' && (
              <p className="text-[10px] text-zinc-500">Select or drag an object/trigger in Constructor mode.</p>
            )}
          </section>

          <section className="border border-zinc-900 bg-zinc-900/30 rounded-xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5" />
              Tuning
            </h3>
            {[
              ['playerSpeed', 'Hero speed', 2, 10, 0.5],
              ['jumpForce', 'Jump force', 8, 18, 0.5],
              ['gravity', 'Gravity', 0.3, 1.5, 0.1],
              ['doorBaseSpeed', 'Door base speed', 1, 8, 0.1],
              ['doorAccelSpeed', 'Door max speed', 4, 18, 0.5],
              ['doorHoming', 'Door homing', 0.05, 0.8, 0.05],
              ['skipButtonDelay', 'Skip delay', 0.5, 5, 0.1],
            ].map(([key, label, min, max, step]) => (
              <div key={key as string} className="mb-3">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-zinc-300">{label as string}</span>
                  <span className="text-amber-500 font-mono">{config[key as keyof GameConfig] as number}</span>
                </div>
                <input
                  type="range"
                  min={min as number}
                  max={max as number}
                  step={step as number}
                  value={config[key as keyof GameConfig] as number}
                  onChange={(e) => updateActiveConfig({ ...config, [key as string]: parseFloat(e.target.value) })}
                  className="w-full accent-amber-500 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>
            ))}
          </section>

          <section className="border border-zinc-900 bg-zinc-900/30 rounded-xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center justify-between">
              <span>Import / Export</span>
              <FileCode2 className="w-3.5 h-3.5" />
            </h3>
            <textarea
              value={jsonText}
              onChange={(e) => handleJsonInputChange(e.target.value)}
              className={`w-full h-36 bg-black border rounded-lg p-2.5 text-[10px] font-mono focus:outline-none focus:ring-1 ${isJsonValid ? 'border-zinc-800 text-zinc-300 focus:border-amber-500 focus:ring-amber-500/30' : 'border-red-500 text-red-400 focus:border-red-500 focus:ring-red-500/30'}`}
            />
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button onClick={() => copyText(JSON.stringify(activeProject, null, 2), 'json')} className="py-2 px-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer">
                {copied === 'json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                Project JSON
              </button>
              <a href={`data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(activeProject, null, 2))}`} download={`${activeProject.name}.json`} className="py-2 px-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer">
                <Download className="w-3.5 h-3.5" />
                JSON File
              </a>
              <button onClick={() => copyText(standalonePlayable, 'code')} className="py-2 px-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer">
                {copied === 'code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <FileCode2 className="w-3.5 h-3.5" />}
                Copy Code
              </button>
              <a href={`data:text/html;charset=utf-8,${encodeURIComponent(standalonePlayable)}`} download={`${activeProject.name}.html`} className="py-2 px-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer">
                <Download className="w-3.5 h-3.5" />
                HTML
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

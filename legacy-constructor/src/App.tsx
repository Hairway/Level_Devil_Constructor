import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AnalyticsEvent,
  CollisionRole,
  EditorMode,
  EditorTool,
  GameConfig,
  LevelObject,
  MotionMode,
  ObjectActionKind,
  PlayableProject,
  PlayableRun,
  TrapObjectType,
  TriggerZone,
} from './types';
import LevelDevilGame from './components/LevelDevilGame';
import ErrorBoundary from './components/ErrorBoundary';
import { DEFAULT_BG, DEFAULT_GROUND, defaultAction, defaultMotion, objectCatalog, objectMotion, objectPreset } from './objectModel';
import { generateStandalonePlayable } from './exportPlayable';

// Lazy so Firebase/Drive stays out of the initial bundle and only loads when opened.
const GoogleDriveSync = lazy(() => import('./components/GoogleDriveSync'));
import {
  ArrowDown,
  ArrowUp,
  Boxes,
  Check,
  Cloud,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileCode2,
  Gamepad2,
  GitBranch,
  Grid3x3,
  Layers,
  Link2,
  MousePointer2,
  Palette,
  Pipette,
  Plus,
  RotateCcw,
  Sliders,
  Terminal,
  Trash2,
  Upload,
} from 'lucide-react';

const makeId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
const STORAGE_KEY = 'level-devil-constructor-state-v3';

// Clean build playable: just the spike-gate + chasing door scenario (no experimental traps).
const baseObjects = (): LevelObject[] => [
  { id: 'spike-a', type: 'spike', x: 300, y: 281, width: 30, height: 22, label: 'First spike', initiallyActive: true },
  { id: 'spike-b', type: 'spike', x: 420, y: 281, width: 30, height: 22, label: 'Second spike', initiallyActive: true },
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
];

const baseTuning = () => ({
  playerSpeed: 3.5,
  jumpForce: 11,
  gravity: 0.7,
  doorBaseSpeed: 2.5,
  doorAccelSpeed: 6,
  doorHoming: 0.25,
  triggerDistance: 260,
  skipButtonDelay: 1.8,
  playerSpawnX: 90,
  doorSpawnX: 720,
  groundOffset: 10,
});

const configFrom = (objects: LevelObject[], triggers: TriggerZone[]): GameConfig => ({
  ...baseTuning(),
  spikes: objects.filter((object) => object.type === 'spike').map((object) => object.x),
  objects,
  triggers,
});

const createDefaultConfig = (): GameConfig => configFrom(baseObjects(), baseTriggers());

// A genuinely empty run: no objects, no triggers (the "Empty Run" button uses this).
const createEmptyConfig = (): GameConfig => configFrom([], []);

// Sandbox playable showcasing every object type and the new behaviours (kept out of the build).
const createTestConfig = (): GameConfig => {
  const objects: LevelObject[] = [
    { id: 'spike-1', type: 'spike', x: 260, y: 281, width: 30, height: 22, label: 'Spike', initiallyActive: true, role: 'hazard' },
    {
      id: 'pit-split', type: 'pit', x: 430, y: 281, width: 110, height: 42, label: 'Splitting pit',
      initiallyActive: false, role: 'pit',
    },
    {
      id: 'saw-chase', type: 'saw', x: 640, y: 150, width: 40, height: 40, label: 'Chasing saw',
      initiallyActive: false, role: 'hazard',
      motion: { ...defaultMotion(), mode: 'chase', target: 'player', speed: 2.4, startOn: 'trigger' },
    },
    {
      id: 'laser-sweep', type: 'laser', x: 400, y: 150, width: 130, height: 12, label: 'Sweeping laser',
      initiallyActive: true, role: 'hazard',
      motion: { ...defaultMotion(), mode: 'linear', speed: 1.6, dirX: 0, dirY: 1, distance: 90, loop: true },
    },
    {
      id: 'plat-fall', type: 'platform', x: 560, y: 90, width: 90, height: 18, label: 'Falling platform',
      initiallyActive: false, role: 'solid',
      motion: { ...defaultMotion(), mode: 'fall', startOn: 'trigger' },
    },
    {
      id: 'btn-skip', type: 'button', x: 150, y: 150, width: 70, height: 30, label: 'Skip',
      initiallyActive: true, role: 'decor', clickable: true, appearDelay: 1.5,
      action: { kind: 'splitFloor', targetId: 'pit-split' },
    },
  ];
  const triggers: TriggerZone[] = [
    { id: 'tz-saw', x: 540, y: 170, width: 60, height: 110, targetId: 'saw-chase', action: 'activate', label: 'Wake saw' },
    { id: 'tz-plat', x: 480, y: 60, width: 70, height: 90, targetId: 'plat-fall', action: 'activate', label: 'Drop platform' },
  ];
  return configFrom(objects, triggers);
};

const cloneConfig = (config: GameConfig): GameConfig => ({
  ...config,
  spikes: [...config.spikes],
  objects: config.objects.map((object) => ({ ...object })),
  triggers: config.triggers.map((trigger) => ({ ...trigger })),
  triggerLayers: config.triggerLayers ? config.triggerLayers.map((layer) => ({ ...layer })) : undefined,
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

// Separate sandbox project so experimental traps never leak into the build playable.
const createTestProject = (): PlayableProject => ({
  id: 'level-devil-test-001',
  name: 'Test Playable',
  runs: [createRun('Sandbox', createTestConfig())],
});

const createDefaultProjects = (): PlayableProject[] => [createInitialProject(), createTestProject()];

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
  if (typeof window === 'undefined') return createDefaultProjects();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultProjects();
    const parsed = JSON.parse(raw) as Partial<PlayableProject>[] | Partial<PlayableProject>;
    const projects = Array.isArray(parsed) ? parsed.map(normalizeProject) : [normalizeProject(parsed)];
    return projects.length > 0 ? projects : createDefaultProjects();
  } catch {
    return createDefaultProjects();
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

// Reusable inputs at module scope so React keeps them mounted (otherwise typing loses focus).
const inputClass = 'w-full bg-black border border-zinc-800 rounded px-2 py-1.5 text-zinc-300 font-mono';

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
      className={inputClass}
    />
  </label>
);

const SelectField = <T extends string>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) => (
  <label className="block">
    <span className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1 block">{label}</span>
    <select value={value} onChange={(e) => onChange(e.target.value as T)} className={`${inputClass} text-xs`}>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </label>
);

// Level Devil–flavored preset swatches for quick recoloring.
const PALETTE = ['#c77b00', '#e2a33c', '#231708', '#8a1f10', '#ef4444', '#f59e0b', '#fef08a', '#10b981', '#38bdf8', '#a855f7', '#ffffff', '#000000'];

const ColorField = ({ label, value, onChange, onReset }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onReset?: () => void;
}) => {
  const hasEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window;
  const pickWithEyeDropper = async () => {
    try {
      const result = await new (window as any).EyeDropper().open();
      if (result?.sRGBHex) onChange(result.sRGBHex);
    } catch {
      /* user cancelled */
    }
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</span>
        {onReset && (
          <button onClick={onReset} className="text-[10px] text-zinc-500 hover:text-zinc-300 cursor-pointer">reset</button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-8 bg-black border border-zinc-800 rounded cursor-pointer p-0.5"
          title="Pick color"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-black border border-zinc-800 rounded px-2 py-1.5 text-[11px] font-mono text-zinc-300"
        />
        {hasEyeDropper && (
          <button
            onClick={pickWithEyeDropper}
            title="Eyedropper — pick any color on screen"
            className="w-8 h-8 shrink-0 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded flex items-center justify-center cursor-pointer"
          >
            <Pipette className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1 mt-1.5">
        {PALETTE.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            title={c}
            className={`w-5 h-5 rounded border ${value.toLowerCase() === c.toLowerCase() ? 'border-white' : 'border-zinc-700'} cursor-pointer`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    </div>
  );
};

const MOTION_MODES: Array<{ value: MotionMode; label: string }> = [
  { value: 'static', label: 'Static' },
  { value: 'linear', label: 'Linear (direction)' },
  { value: 'chase', label: 'Chase target' },
  { value: 'fall', label: 'Fall' },
  { value: 'orbit', label: 'Orbit (circle a point)' },
  { value: 'pendulum', label: 'Pendulum (swing)' },
  { value: 'path', label: 'Path (waypoints)' },
];
const FONT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'Arial', label: 'Arial' },
  { value: 'Georgia, serif', label: 'Georgia (serif)' },
  { value: 'Times New Roman, serif', label: 'Times' },
  { value: 'Courier New, monospace', label: 'Courier (mono)' },
  { value: 'Impact, sans-serif', label: 'Impact' },
  { value: 'Comic Sans MS, cursive', label: 'Comic Sans' },
  { value: 'Trebuchet MS, sans-serif', label: 'Trebuchet' },
  { value: 'Verdana, sans-serif', label: 'Verdana' },
];
const ROLE_OPTIONS: Array<{ value: CollisionRole; label: string }> = [
  { value: 'hazard', label: 'Hazard (kills)' },
  { value: 'solid', label: 'Solid (platform)' },
  { value: 'spring', label: 'Spring (bounces up)' },
  { value: 'pit', label: 'Pit (hole)' },
  { value: 'decor', label: 'Decor (no collision)' },
];
const ACTION_OPTIONS: Array<{ value: ObjectActionKind; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'activate', label: 'Activate target (show)' },
  { value: 'deactivate', label: 'Deactivate target (hide/vanish)' },
  { value: 'toggle', label: 'Toggle target (show/hide)' },
  { value: 'openPit', label: 'Open pit' },
  { value: 'splitFloor', label: 'Split floor open' },
  { value: 'collapseFloor', label: 'Collapse whole floor' },
  { value: 'startDoorChase', label: 'Start door chase' },
  { value: 'nextRun', label: 'Skip to next run' },
  { value: 'redirectCTA', label: 'Redirect to CTA' },
  { value: 'chain', label: 'Fire another trigger (chain)' },
];

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
  const [showDriveSync, setShowDriveSync] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
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
    const sourceConfig = copyCurrent ? sourceRun.config : createEmptyConfig();
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
    const isTrigger = next.triggers.some((trigger) => trigger.id === selectedEntityId);
    if (isTrigger) {
      // Delete ONLY the selected trigger.
      next.triggers = next.triggers.filter((trigger) => trigger.id !== selectedEntityId);
    } else {
      // Delete only the selected object; keep triggers but retarget any that pointed at it.
      next.objects = next.objects.filter((object) => object.id !== selectedEntityId);
      next.triggers = next.triggers.map((trigger) =>
        trigger.targetId === selectedEntityId ? { ...trigger, targetId: 'door' } : trigger,
      );
    }
    updateActiveConfig(next);
    setSelectedEntityId(null);
  };

  const updateSelectedObject = (patch: Partial<LevelObject>) => {
    if (!selectedEntityId) return;
    const next = cloneConfig(config);
    next.objects = next.objects.map((object) => object.id === selectedEntityId ? { ...object, ...patch } : object);
    updateActiveConfig(next);
  };

  // Edit the motion of a specific object (used by the trigger panel to set what the target does).
  const updateObjectMotionById = (objId: string, patch: Partial<NonNullable<LevelObject['motion']>>) => {
    const next = cloneConfig(config);
    next.objects = next.objects.map((object) =>
      object.id === objId ? { ...object, motion: { ...objectMotion(object), ...patch } } : object,
    );
    updateActiveConfig(next);
  };

  // Read an uploaded image as a data URL and store it as the object's sprite (embeds into export).
  const handleSpriteUpload = (e: { target: HTMLInputElement }) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 1_500_000) {
      addLog('SYSTEM', 'Image too large (max ~1.5MB) for embedding');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateSelectedObject({ spriteUrl: String(reader.result) });
      addLog('OBJECT', `Loaded custom sprite "${file.name}"`);
    };
    reader.readAsDataURL(file);
  };

  // Read an uploaded font file, embed it as a data URL, and use its filename as the family name.
  const handleFontUpload = (e: { target: HTMLInputElement }) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 2_500_000) {
      addLog('SYSTEM', 'Font too large (max ~2.5MB) for embedding');
      return;
    }
    const family = `custom-${file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const reader = new FileReader();
    reader.onload = () => {
      const fontUrl = String(reader.result);
      try {
        const ff = new FontFace(family, `url(${fontUrl})`);
        (document as unknown as { fonts: FontFaceSet }).fonts.add(ff);
        ff.load().catch(() => {});
      } catch { /* ignore */ }
      updateSelectedObject({ fontUrl, fontFamily: family });
      addLog('OBJECT', `Loaded custom font "${file.name}"`);
    };
    reader.readAsDataURL(file);
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

  // Write the active project straight into the IMPION template's src/level.json (dev server only).
  const exportToTemplate = async () => {
    try {
      const res = await fetch('/api/export-level', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activeProject),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setCopied('template');
        addLog('EXPORT', `Wrote level to template (${data.path || 'src/level.json'}) — rebuild the template`);
        setTimeout(() => setCopied(null), 1600);
      } else {
        addLog('SYSTEM', `Export failed: ${data.error || res.status}`);
      }
    } catch (e) {
      addLog('SYSTEM', 'Export failed (is the constructor dev server running?)');
    }
  };

  const standalonePlayable = useMemo(() => generateStandalonePlayable(activeProject), [activeProject]);
  const selectedObject = config.objects.find((object) => object.id === selectedEntityId);
  const selectedTrigger = config.triggers.find((trigger) => trigger.id === selectedEntityId);
  const linkedTriggers = selectedObject ? config.triggers.filter((trigger) => trigger.targetId === selectedObject.id) : [];
  const selObjMotion = selectedObject ? objectMotion(selectedObject) : null;
  const selObjAction = selectedObject?.action || defaultAction();
  const actionTargetOptions: Array<{ value: string; label: string }> = [
    { value: 'door', label: 'Door' },
    ...config.objects.filter((object) => object.id !== selectedEntityId).map((object) => ({ value: object.id, label: object.label })),
  ];
  const updateSelectedMotion = (patch: Partial<NonNullable<LevelObject['motion']>>) => {
    if (!selectedObject) return;
    updateSelectedObject({ motion: { ...objectMotion(selectedObject), ...patch } });
  };
  const updateSelectedAction = (patch: Partial<NonNullable<LevelObject['action']>>) => {
    if (!selectedObject) return;
    updateSelectedObject({ action: { ...(selectedObject.action || defaultAction()), ...patch } });
  };
  const selectedSpecialX = selectedEntityId === 'playerSpawn'
    ? config.playerSpawnX
    : selectedEntityId === 'door'
      ? config.doorSpawnX
      : null;

  // Editor keyboard shortcuts: Delete removes, Ctrl/Cmd+D duplicates, arrows nudge the selection.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editorMode !== 'constructor' || !selectedEntityId) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return;
      const isSpecial = selectedEntityId === 'playerSpawn' || selectedEntityId === 'door';

      if ((e.key === 'Delete' || e.key === 'Backspace') && !isSpecial) {
        e.preventDefault();
        deleteSelected();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'd' || e.key === 'D') && !isSpecial) {
        e.preventDefault();
        duplicateSelected();
        return;
      }
      const step = e.shiftKey ? 10 : 1;
      const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
      const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
      if (dx === 0 && dy === 0) return;
      e.preventDefault();
      if (selectedObject) {
        updateSelectedObject({
          x: Math.max(0, Math.min(800, selectedObject.x + dx)),
          y: Math.max(0, Math.min(328, selectedObject.y + dy)),
        });
      } else if (selectedTrigger) {
        updateSelectedTrigger({
          x: Math.max(0, Math.min(800, selectedTrigger.x + dx)),
          y: Math.max(0, Math.min(328, selectedTrigger.y + dy)),
        });
      } else if (isSpecial && dx !== 0) {
        updateSpecialSelectionX((selectedSpecialX ?? 0) + dx);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

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
            gridSnap={snapToGrid ? 10 : 0}
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
              <button
                onClick={() => setSnapToGrid((v) => !v)}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 cursor-pointer col-span-2 ${snapToGrid ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
              >
                <Grid3x3 className="w-3.5 h-3.5" />
                Snap to grid {snapToGrid ? '(10px)' : 'off'}
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
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <Layers className="w-3.5 h-3.5" />
                Trigger Layers
              </h3>
              <button
                onClick={() => updateActiveConfig({ ...config, triggerLayers: [...(config.triggerLayers || []), { name: `Layer ${(config.triggerLayers || []).length + 1}`, color: PALETTE[((config.triggerLayers || []).length + 4) % PALETTE.length], hidden: false }] })}
                className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            {(config.triggerLayers || []).length === 0 ? (
              <p className="text-[10px] text-zinc-600">Group triggers into layers to recolor them or hide/show whole groups on the canvas. Assign a trigger to a layer in its editor.</p>
            ) : (
              <div className="space-y-2">
                {(config.triggerLayers || []).map((layer, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={layer.color}
                      onChange={(e) => updateActiveConfig({ ...config, triggerLayers: (config.triggerLayers || []).map((l, idx) => idx === i ? { ...l, color: e.target.value } : l) })}
                      className="w-7 h-7 bg-black border border-zinc-800 rounded cursor-pointer p-0.5 shrink-0"
                      title="Layer color"
                    />
                    <input
                      value={layer.name}
                      onChange={(e) => {
                        const oldName = layer.name;
                        const newName = e.target.value;
                        updateActiveConfig({
                          ...config,
                          triggerLayers: (config.triggerLayers || []).map((l, idx) => idx === i ? { ...l, name: newName } : l),
                          triggers: config.triggers.map((t) => t.layer === oldName ? { ...t, layer: newName } : t),
                        });
                      }}
                      className="flex-1 bg-black border border-zinc-800 rounded px-2 py-1 text-[11px] text-zinc-300"
                    />
                    <button
                      onClick={() => updateActiveConfig({ ...config, triggerLayers: (config.triggerLayers || []).map((l, idx) => idx === i ? { ...l, hidden: !l.hidden } : l) })}
                      className="p-1.5 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 cursor-pointer"
                      title={layer.hidden ? 'Show layer' : 'Hide layer'}
                    >
                      {layer.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => updateActiveConfig({ ...config, triggerLayers: (config.triggerLayers || []).filter((_, idx) => idx !== i), triggers: config.triggers.map((t) => t.layer === layer.name ? { ...t, layer: undefined } : t) })}
                      className="p-1.5 rounded bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 cursor-pointer"
                      title="Delete layer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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

                <div className="rounded-lg border border-zinc-800 bg-black/40 p-2 space-y-2">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500">Collision &amp; appearance</div>
                  <SelectField
                    label="Collision role"
                    value={(selectedObject.role || objectPreset(selectedObject.type).role)}
                    options={ROLE_OPTIONS}
                    onChange={(role) => updateSelectedObject({ role: role as CollisionRole })}
                  />
                  {(selectedObject.role || objectPreset(selectedObject.type).role) === 'spring' && (
                    <NumberField label="Bounce force" value={selectedObject.bounce ?? 18} min={6} max={30} step={1} onChange={(bounce) => updateSelectedObject({ bounce })} />
                  )}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase tracking-wider text-zinc-500">Rotation</span>
                      <div className="flex gap-1">
                        {[0, 90, 180, 270].map((deg) => (
                          <button
                            key={deg}
                            onClick={() => updateSelectedObject({ rotation: deg })}
                            className={`px-1.5 py-0.5 rounded text-[10px] border cursor-pointer ${(selectedObject.rotation || 0) % 360 === deg ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
                          >
                            {deg}°
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={360}
                      step={5}
                      value={selectedObject.rotation || 0}
                      onChange={(e) => updateSelectedObject({ rotation: Number(e.target.value) })}
                      className="w-full accent-amber-500 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                    />
                    <p className="text-[10px] text-zinc-600 mt-0.5">180° = ceiling spike · 90/270° = wall spike</p>
                  </div>
                  <NumberField label="Spin (°/frame, e.g. saws)" value={selectedObject.spin || 0} min={0} max={30} step={0.5} onChange={(spin) => updateSelectedObject({ spin })} />
                  <SelectField
                    label="Kills player on touch"
                    value={selectedObject.deadly === undefined ? 'auto' : selectedObject.deadly ? 'always' : 'never'}
                    options={[
                      { value: 'auto', label: 'Auto (hazard types kill)' },
                      { value: 'always', label: 'Always kills' },
                      { value: 'never', label: 'Never kills (safe)' },
                    ]}
                    onChange={(v) => updateSelectedObject({ deadly: v === 'auto' ? undefined : v === 'always' })}
                  />
                  {(selectedObject.deadly !== false && (selectedObject.deadly || (selectedObject.role || objectPreset(selectedObject.type).role) === 'hazard')) && (
                    <label className="flex items-center gap-2 text-zinc-400">
                      <input type="checkbox" checked={!!selectedObject.deadlyWhileMoving} onChange={(e) => updateSelectedObject({ deadlyWhileMoving: e.target.checked })} />
                      Lethal only while moving (safe once landed)
                    </label>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <NumberField label="Appears after (s)" value={selectedObject.appearDelay || 0} min={0} max={20} step={0.1} onChange={(appearDelay) => updateSelectedObject({ appearDelay })} />
                    <NumberField label="Vanishes after (s, 0=never)" value={selectedObject.vanishAfter || 0} min={0} max={20} step={0.1} onChange={(vanishAfter) => updateSelectedObject({ vanishAfter: vanishAfter || undefined })} />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
                      <span>Opacity</span>
                      <span className="text-amber-500 font-mono">{Math.round((selectedObject.opacity ?? 1) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={selectedObject.opacity ?? 1}
                      onChange={(e) => updateSelectedObject({ opacity: parseFloat(e.target.value) })}
                      className="w-full accent-amber-500 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                    />
                  </div>
                  <SelectField
                    label="Attach to (moves with)"
                    value={selectedObject.attachTo || ''}
                    options={[
                      { value: '', label: 'Nothing' },
                      { value: 'door', label: 'Door (e.g. spikes on door)' },
                      { value: 'player', label: 'Player' },
                      ...config.objects.filter((o) => o.id !== selectedEntityId).map((o) => ({ value: o.id, label: o.label })),
                    ]}
                    onChange={(attachTo) => updateSelectedObject({ attachTo: attachTo || undefined })}
                  />
                  <ColorField
                    label="Color"
                    value={selectedObject.color || '#ffffff'}
                    onChange={(color) => updateSelectedObject({ color })}
                    onReset={selectedObject.color ? () => updateSelectedObject({ color: undefined }) : undefined}
                  />
                  <label className="block">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1 block">Custom sprite</span>
                    <input
                      value={selectedObject.spriteUrl && selectedObject.spriteUrl.startsWith('data:') ? '(uploaded image)' : (selectedObject.spriteUrl || '')}
                      placeholder="Paste image URL, or upload below"
                      readOnly={!!selectedObject.spriteUrl && selectedObject.spriteUrl.startsWith('data:')}
                      onChange={(e) => updateSelectedObject({ spriteUrl: e.target.value || undefined })}
                      className={`${inputClass} text-[10px]`}
                    />
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 py-1.5 px-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      Upload image
                      <input type="file" accept="image/*" className="hidden" onChange={handleSpriteUpload} />
                    </label>
                    {selectedObject.spriteUrl && (
                      <>
                        <img src={selectedObject.spriteUrl} alt="sprite" className="w-8 h-8 object-contain bg-black/40 border border-zinc-800 rounded" style={{ imageRendering: 'pixelated' }} />
                        <button
                          onClick={() => updateSelectedObject({ spriteUrl: undefined })}
                          className="py-1.5 px-2 bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 rounded text-[11px] cursor-pointer"
                        >
                          Clear
                        </button>
                      </>
                    )}
                  </div>
                  {(selectedObject.type === 'button' || selectedObject.type === 'text') && (
                    <>
                      <label className="block">
                        <span className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1 block">{selectedObject.type === 'text' ? 'Text content' : 'Button text'}</span>
                        <input
                          value={selectedObject.text ?? selectedObject.label ?? ''}
                          placeholder={selectedObject.type === 'text' ? 'Type your text…' : 'e.g. SKIP'}
                          onChange={(e) => updateSelectedObject({ text: e.target.value })}
                          className={`${inputClass} text-[11px]`}
                        />
                      </label>
                      <SelectField
                        label="Font"
                        value={selectedObject.fontFamily || 'Arial'}
                        options={selectedObject.fontUrl && selectedObject.fontFamily
                          ? [{ value: selectedObject.fontFamily, label: `${selectedObject.fontFamily} (uploaded)` }, ...FONT_OPTIONS]
                          : FONT_OPTIONS}
                        onChange={(fontFamily) => updateSelectedObject({ fontFamily })}
                      />
                      <label className="flex-1 py-1.5 px-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        {selectedObject.fontUrl ? 'Replace custom font' : 'Upload custom font'}
                        <input type="file" accept=".ttf,.otf,.woff,.woff2,font/*" className="hidden" onChange={handleFontUpload} />
                      </label>
                      {selectedObject.type === 'text' && (
                        <NumberField label="Text size (px)" value={selectedObject.fontSize || selectedObject.height} min={8} max={120} step={1} onChange={(fontSize) => updateSelectedObject({ fontSize })} />
                      )}
                      <ColorField
                        label="Text color"
                        value={selectedObject.textColor || (selectedObject.type === 'text' ? '#ffffff' : '#231708')}
                        onChange={(textColor) => updateSelectedObject({ textColor })}
                        onReset={selectedObject.textColor ? () => updateSelectedObject({ textColor: undefined }) : undefined}
                      />
                    </>
                  )}
                </div>

                {selObjMotion && (
                  <div className="rounded-lg border border-zinc-800 bg-black/40 p-2 space-y-2">
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500">Motion</div>
                    <SelectField label="Mode" value={selObjMotion.mode} options={MOTION_MODES} onChange={(mode) => updateSelectedMotion({ mode: mode as MotionMode })} />
                    {selObjMotion.mode !== 'static' && (
                      <div className="grid grid-cols-2 gap-2">
                        <NumberField label="Speed" value={selObjMotion.speed} min={0} max={12} step={0.1} onChange={(speed) => updateSelectedMotion({ speed })} />
                        <NumberField label="Start delay (s)" value={selObjMotion.delay} min={0} max={10} step={0.1} onChange={(delay) => updateSelectedMotion({ delay })} />
                      </div>
                    )}
                    {selObjMotion.mode === 'chase' && (
                      <SelectField
                        label="Chase target"
                        value={selObjMotion.target}
                        options={[
                          { value: 'player', label: 'Player' },
                          { value: 'door', label: 'Door' },
                          ...config.objects
                            .filter((object) => object.id !== selectedEntityId)
                            .map((object) => ({ value: object.id, label: object.label })),
                        ]}
                        onChange={(target) => updateSelectedMotion({ target })}
                      />
                    )}
                    {selObjMotion.mode === 'linear' && (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <NumberField label="Dir X (-1..1)" value={selObjMotion.dirX} min={-1} max={1} step={0.1} onChange={(dirX) => updateSelectedMotion({ dirX })} />
                          <NumberField label="Dir Y (-1..1)" value={selObjMotion.dirY} min={-1} max={1} step={0.1} onChange={(dirY) => updateSelectedMotion({ dirY })} />
                        </div>
                        <NumberField label="Max distance (0=∞)" value={selObjMotion.distance} min={0} max={800} step={5} onChange={(distance) => updateSelectedMotion({ distance })} />
                        <label className="flex items-center gap-2 text-zinc-400">
                          <input type="checkbox" checked={selObjMotion.loop} onChange={(e) => updateSelectedMotion({ loop: e.target.checked })} />
                          Loop back and forth
                        </label>
                      </>
                    )}
                    {(selObjMotion.mode === 'orbit' || selObjMotion.mode === 'pendulum') && (
                      <>
                        <NumberField label="Radius (px)" value={selObjMotion.distance || 40} min={8} max={400} step={2} onChange={(distance) => updateSelectedMotion({ distance })} />
                        {selObjMotion.mode === 'orbit' && (
                          <label className="flex items-center gap-2 text-zinc-400">
                            <input type="checkbox" checked={selObjMotion.loop} onChange={(e) => updateSelectedMotion({ loop: e.target.checked })} />
                            Reverse direction
                          </label>
                        )}
                        <p className="text-[10px] text-zinc-600">{selObjMotion.mode === 'orbit' ? 'Circles around the point where you placed it.' : 'Swings like a blade; rest position is where you placed it.'}</p>
                      </>
                    )}
                    {selObjMotion.mode === 'path' && selectedObject && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase tracking-wider text-zinc-500">Waypoints (start = placed point)</span>
                          <button
                            onClick={() => {
                              const wps = selObjMotion.waypoints || [];
                              const last = wps.length ? wps[wps.length - 1] : { x: selectedObject.x, y: selectedObject.y };
                              updateSelectedMotion({ waypoints: [...wps, { x: Math.min(800, last.x + 60), y: last.y }] });
                            }}
                            className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 cursor-pointer flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Add point
                          </button>
                        </div>
                        {(selObjMotion.waypoints || []).length === 0 && (
                          <p className="text-[10px] text-zinc-600">Add points; the object travels placed→1→2→… Enable loop to patrol back and forth.</p>
                        )}
                        {(selObjMotion.waypoints || []).map((wp, i) => (
                          <div key={i} className="grid grid-cols-[auto_1fr_1fr_auto] gap-1.5 items-end">
                            <span className="text-[10px] text-zinc-500 pb-2">#{i + 1}</span>
                            <NumberField label="X" value={wp.x} min={0} max={800} onChange={(x) => updateSelectedMotion({ waypoints: (selObjMotion.waypoints || []).map((p, idx) => idx === i ? { ...p, x } : p) })} />
                            <NumberField label="Y" value={wp.y} min={0} max={328} onChange={(y) => updateSelectedMotion({ waypoints: (selObjMotion.waypoints || []).map((p, idx) => idx === i ? { ...p, y } : p) })} />
                            <button
                              onClick={() => updateSelectedMotion({ waypoints: (selObjMotion.waypoints || []).filter((_, idx) => idx !== i) })}
                              className="mb-0.5 p-1.5 rounded bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 cursor-pointer"
                              title="Remove point"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        <label className="flex items-center gap-2 text-zinc-400">
                          <input type="checkbox" checked={selObjMotion.loop} onChange={(e) => updateSelectedMotion({ loop: e.target.checked })} />
                          Patrol back and forth (loop)
                        </label>
                      </div>
                    )}
                    {selObjMotion.mode !== 'static' && (
                      <SelectField
                        label="Starts"
                        value={selObjMotion.startOn}
                        options={[{ value: 'spawn', label: 'On spawn' }, { value: 'trigger', label: 'When triggered/activated' }]}
                        onChange={(startOn) => updateSelectedMotion({ startOn: startOn as 'spawn' | 'trigger' })}
                      />
                    )}
                  </div>
                )}

                <div className="rounded-lg border border-zinc-800 bg-black/40 p-2 space-y-2">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500">Action</div>
                  <SelectField label="Does" value={selObjAction.kind} options={ACTION_OPTIONS} onChange={(kind) => updateSelectedAction({ kind: kind as ObjectActionKind })} />
                  {selObjAction.kind !== 'none' && !['collapseFloor', 'nextRun', 'redirectCTA'].includes(selObjAction.kind) && (
                    <SelectField label="On target" value={selObjAction.targetId} options={actionTargetOptions} onChange={(targetId) => updateSelectedAction({ targetId })} />
                  )}
                  <label className="flex items-center gap-2 text-zinc-400">
                    <input type="checkbox" checked={!!selectedObject.clickable} onChange={(e) => updateSelectedObject({ clickable: e.target.checked })} />
                    Clickable (tap fires action)
                  </label>
                  <p className="text-[10px] text-zinc-600">
                    {selectedObject.clickable
                      ? 'Player taps this object to fire the action.'
                      : 'Action fires when the player touches this object.'}
                  </p>
                  <div className="border-t border-zinc-900 pt-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider text-zinc-500">Extra actions (fire together)</span>
                      <button
                        onClick={() => updateSelectedObject({ links: [...(selectedObject.links || []), { targetId: 'door', action: 'activate' }] })}
                        className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    </div>
                    {(selectedObject.links || []).map((link, i) => (
                      <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-1.5 items-end">
                        <SelectField
                          label="Does"
                          value={link.action}
                          options={ACTION_OPTIONS.filter((o) => o.value !== 'none')}
                          onChange={(action) => updateSelectedObject({ links: (selectedObject.links || []).map((l, idx) => idx === i ? { ...l, action: action as ObjectActionKind } : l) })}
                        />
                        <SelectField
                          label="On"
                          value={link.targetId}
                          options={[{ value: 'door', label: 'Door' }, ...config.objects.filter((o) => o.id !== selectedEntityId).map((o) => ({ value: o.id, label: o.label }))]}
                          onChange={(targetId) => updateSelectedObject({ links: (selectedObject.links || []).map((l, idx) => idx === i ? { ...l, targetId } : l) })}
                        />
                        <button
                          onClick={() => updateSelectedObject({ links: (selectedObject.links || []).filter((_, idx) => idx !== i) })}
                          className="mb-0.5 p-1.5 rounded bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 cursor-pointer"
                          title="Remove action"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

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
                {(config.triggerLayers || []).length > 0 && (
                  <SelectField
                    label="Layer"
                    value={selectedTrigger.layer || ''}
                    options={[{ value: '', label: 'None (default)' }, ...(config.triggerLayers || []).map((l) => ({ value: l.name, label: l.name }))]}
                    onChange={(layer) => updateSelectedTrigger({ layer: layer || undefined })}
                  />
                )}
                <div className="grid grid-cols-2 gap-2">
                  <NumberField label="X" value={selectedTrigger.x} min={0} max={800} onChange={(x) => updateSelectedTrigger({ x })} />
                  <NumberField label="Y" value={selectedTrigger.y} min={0} max={328} onChange={(y) => updateSelectedTrigger({ y })} />
                  <NumberField label="Width" value={selectedTrigger.width} min={10} max={260} onChange={(width) => updateSelectedTrigger({ width })} />
                  <NumberField label="Height" value={selectedTrigger.height} min={10} max={260} onChange={(height) => updateSelectedTrigger({ height })} />
                </div>
                <SelectField
                  label="Action"
                  value={selectedTrigger.action}
                  options={ACTION_OPTIONS.filter((option) => option.value !== 'none') as Array<{ value: TriggerZone['action']; label: string }>}
                  onChange={(action) => updateSelectedTrigger({ action })}
                />
                {selectedTrigger.action === 'chain' ? (
                  <SelectField
                    label="Chain to trigger"
                    value={selectedTrigger.targetId}
                    options={config.triggers.filter((t) => t.id !== selectedEntityId).map((t) => ({ value: t.id, label: t.label }))}
                    onChange={(targetId) => updateSelectedTrigger({ targetId })}
                  />
                ) : !['collapseFloor', 'nextRun', 'redirectCTA'].includes(selectedTrigger.action) && (
                  <SelectField
                    label="Target"
                    value={selectedTrigger.targetId}
                    options={[{ value: 'door', label: 'Door' }, ...config.objects.map((object) => ({ value: object.id, label: object.label }))]}
                    onChange={(targetId) => updateSelectedTrigger({ targetId })}
                  />
                )}
                {(() => {
                  // "Full engine" trigger control: pick what the target OBJECT does when fired.
                  if (selectedTrigger.action !== 'activate') return null;
                  const target = config.objects.find((o) => o.id === selectedTrigger.targetId);
                  if (!target) return null;
                  const m = objectMotion(target);
                  const behavior = m.mode === 'chase' ? 'chase' : m.mode === 'fall' ? 'fall' : m.mode === 'linear' ? 'move' : 'activate';
                  const setBehavior = (b: string) => {
                    if (b === 'activate') updateObjectMotionById(target.id, { mode: 'static', startOn: 'trigger' });
                    else if (b === 'chase') updateObjectMotionById(target.id, { mode: 'chase', target: 'player', startOn: 'trigger' });
                    else if (b === 'fall') updateObjectMotionById(target.id, { mode: 'fall', startOn: 'trigger' });
                    else updateObjectMotionById(target.id, { mode: 'linear', startOn: 'trigger' });
                  };
                  const dirValue = m.dirY < 0 ? 'up' : m.dirY > 0 ? 'down' : m.dirX < 0 ? 'left' : 'right';
                  const setDir = (d: string) => {
                    const map: Record<string, { dirX: number; dirY: number }> = { right: { dirX: 1, dirY: 0 }, left: { dirX: -1, dirY: 0 }, up: { dirX: 0, dirY: -1 }, down: { dirX: 0, dirY: 1 } };
                    updateObjectMotionById(target.id, map[d]);
                  };
                  return (
                    <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-2 space-y-2">
                      <div className="text-[10px] uppercase tracking-wider text-amber-500/80">When triggered, target</div>
                      <SelectField
                        label={`"${target.label}"`}
                        value={behavior}
                        options={[
                          { value: 'activate', label: 'Just appears / activates' },
                          { value: 'chase', label: 'Chases the player' },
                          { value: 'fall', label: 'Falls down' },
                          { value: 'move', label: 'Moves in a direction' },
                        ]}
                        onChange={setBehavior}
                      />
                      {behavior !== 'activate' && (
                        <NumberField label="Speed" value={m.speed} min={0} max={12} step={0.1} onChange={(speed) => updateObjectMotionById(target.id, { speed })} />
                      )}
                      {behavior === 'move' && (
                        <>
                          <SelectField
                            label="Direction"
                            value={dirValue}
                            options={[{ value: 'right', label: '→ Right' }, { value: 'left', label: '← Left' }, { value: 'up', label: '↑ Up' }, { value: 'down', label: '↓ Down' }]}
                            onChange={setDir}
                          />
                          <NumberField label="Distance (0 = ∞)" value={m.distance} min={0} max={800} step={5} onChange={(distance) => updateObjectMotionById(target.id, { distance })} />
                          <label className="flex items-center gap-2 text-zinc-400">
                            <input type="checkbox" checked={m.loop} onChange={(e) => updateObjectMotionById(target.id, { loop: e.target.checked })} />
                            Loop back and forth (cyclic)
                          </label>
                        </>
                      )}
                    </div>
                  );
                })()}
                <div className="rounded-lg border border-zinc-800 bg-black/40 p-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500">Extra links (fire together)</span>
                    <button
                      onClick={() => updateSelectedTrigger({ links: [...(selectedTrigger.links || []), { targetId: 'door', action: 'activate' }] })}
                      className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add link
                    </button>
                  </div>
                  {(selectedTrigger.links || []).length === 0 && (
                    <p className="text-[10px] text-zinc-600">One trigger can drive several objects at once. Add links to fire more actions.</p>
                  )}
                  {(selectedTrigger.links || []).map((link, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-1.5 items-end border-t border-zinc-900 pt-2 first:border-t-0 first:pt-0">
                      <SelectField
                        label="Does"
                        value={link.action}
                        options={ACTION_OPTIONS.filter((o) => o.value !== 'none') as Array<{ value: TriggerZone['action']; label: string }>}
                        onChange={(action) => updateSelectedTrigger({ links: (selectedTrigger.links || []).map((l, idx) => idx === i ? { ...l, action } : l) })}
                      />
                      <SelectField
                        label="On"
                        value={link.targetId}
                        options={[{ value: 'door', label: 'Door' }, ...config.objects.map((o) => ({ value: o.id, label: o.label }))]}
                        onChange={(targetId) => updateSelectedTrigger({ links: (selectedTrigger.links || []).map((l, idx) => idx === i ? { ...l, targetId } : l) })}
                      />
                      <button
                        onClick={() => updateSelectedTrigger({ links: (selectedTrigger.links || []).filter((_, idx) => idx !== i) })}
                        className="mb-0.5 p-1.5 rounded bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 cursor-pointer"
                        title="Remove link"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 items-end">
                  <NumberField label={selectedTrigger.auto ? 'Timer (s from start)' : 'Fire delay (s)'} value={selectedTrigger.delay || 0} min={0} max={20} step={0.1} onChange={(delay) => updateSelectedTrigger({ delay })} />
                  <label className="flex items-center gap-2 text-zinc-400 pb-2">
                    <input type="checkbox" checked={!!selectedTrigger.repeat} onChange={(e) => updateSelectedTrigger({ repeat: e.target.checked })} />
                    Repeat
                  </label>
                </div>
                <label className="flex items-center gap-2 text-zinc-400 text-xs">
                  <input type="checkbox" checked={!!selectedTrigger.auto} onChange={(e) => updateSelectedTrigger({ auto: e.target.checked })} />
                  Auto-fire on timer (no touch needed)
                </label>
                <div className="rounded-lg border border-zinc-800 bg-black/40 p-2 space-y-2">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500">Force zone (conveyor / wind)</div>
                  <div className="grid grid-cols-2 gap-2">
                    <NumberField label="Push X (px/frame)" value={selectedTrigger.pushX || 0} min={-10} max={10} step={0.5} onChange={(pushX) => updateSelectedTrigger({ pushX: pushX || undefined })} />
                    <NumberField label="Push Y (px/frame)" value={selectedTrigger.pushY || 0} min={-10} max={10} step={0.5} onChange={(pushY) => updateSelectedTrigger({ pushY: pushY || undefined })} />
                  </div>
                  <p className="text-[10px] text-zinc-600">Pushes the player while they stand in this zone. +X right, −X left, −Y up (updraft).</p>
                </div>
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
              <Palette className="w-3.5 h-3.5" />
              Scene Colors
            </h3>
            <div className="space-y-3">
              <ColorField
                label="Background"
                value={config.bgColor || DEFAULT_BG}
                onChange={(bgColor) => updateActiveConfig({ ...config, bgColor })}
                onReset={config.bgColor && config.bgColor !== DEFAULT_BG ? () => updateActiveConfig({ ...config, bgColor: DEFAULT_BG }) : undefined}
              />
              <ColorField
                label="Ground"
                value={config.groundColor || DEFAULT_GROUND}
                onChange={(groundColor) => updateActiveConfig({ ...config, groundColor })}
                onReset={config.groundColor && config.groundColor !== DEFAULT_GROUND ? () => updateActiveConfig({ ...config, groundColor: DEFAULT_GROUND }) : undefined}
              />
            </div>
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
            <div className="mb-1 pt-1 border-t border-zinc-900">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-zinc-300">Ground offset (nudge down)</span>
                <span className="text-amber-500 font-mono">{config.groundOffset ?? 0}px</span>
              </div>
              <input
                type="range"
                min={-10}
                max={24}
                step={1}
                value={config.groundOffset ?? 0}
                onChange={(e) => updateActiveConfig({ ...config, groundOffset: parseFloat(e.target.value) })}
                className="w-full accent-amber-500 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
              />
              <p className="text-[10px] text-zinc-600 mt-0.5">Visually lowers the hero &amp; traps so they sit on the ground.</p>
            </div>
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
            <button
              onClick={exportToTemplate}
              className="w-full mt-2 py-2 px-3 bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              title="Write this project into the IMPION template's src/level.json (dev server only)"
            >
              {copied === 'template' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <FileCode2 className="w-3.5 h-3.5" />}
              Export to IMPION template
            </button>
          </section>

          <section className="border border-zinc-900 bg-zinc-900/30 rounded-xl p-4">
            <button
              onClick={() => setShowDriveSync((v) => !v)}
              className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-zinc-400 cursor-pointer"
            >
              <span className="flex items-center gap-2"><Cloud className="w-3.5 h-3.5" /> Google Drive Sync</span>
              <span className="text-[10px] text-zinc-500">{showDriveSync ? 'Hide' : 'Show'}</span>
            </button>
            {showDriveSync && (
              <div className="mt-3">
                <ErrorBoundary fallback={<p className="text-[10px] text-red-400">Drive module failed to load (check Firebase config).</p>}>
                  <Suspense fallback={<p className="text-[10px] text-zinc-500">Loading Drive module…</p>}>
                    <GoogleDriveSync
                      currentConfig={config}
                      onConfigChange={updateActiveConfig}
                      onLogEvent={addLog}
                    />
                  </Suspense>
                </ErrorBoundary>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

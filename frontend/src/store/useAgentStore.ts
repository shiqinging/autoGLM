import { create } from 'zustand';

// Task Status as const object (compatible with erasableSyntaxOnly)
export const TaskStatus = {
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  ERROR: 'error',
} as const;

export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

// Log Level Types
export type LogLevel = 'INFO' | 'ACTION' | 'ERROR' | 'SUCCESS' | 'DEBUG';

// Log Item Interface
export interface LogItem {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
}

// Model Config Interface
export interface ModelConfig {
  provider: 'zhipu' | 'openai' | 'anthropic';
  apiKey: string;
  baseUrl: string;
  model: string;
}

// WebSocket State
interface WebSocketState {
  ws: WebSocket | null;
  isConnected: boolean;
  error: string | null;
}

// Agent Store State
interface AgentStore extends WebSocketState {
  // State
  logs: LogItem[];
  status: TaskStatus;
  currentTask: string | null;
  maxLogs: number;
  theme: 'dark' | 'light';
  modelConfig: ModelConfig | null;

  // Actions - Log Management
  addLog: (level: LogLevel, message: string) => void;
  clearLogs: () => void;
  setMaxLogs: (max: number) => void;

  // Actions - Status Management
  setStatus: (status: TaskStatus) => void;
  setCurrentTask: (task: string | null) => void;

  // Actions - Theme Management
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;

  // Actions - Model Config Management
  setModelConfig: (config: ModelConfig | null) => void;

  // Actions - WebSocket Management
  connect: (url: string) => void;
  disconnect: () => void;
  reconnect: (url: string) => void;
}

// Helper to generate unique IDs
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Helper to format timestamp
const formatTimestamp = (): string => {
  return new Date().toISOString();
};

// Maximum logs to keep in memory
const DEFAULT_MAX_LOGS = 500;

// LocalStorage keys
const STORAGE_KEYS = {
  THEME: 'autoGLM-theme',
  MODEL_CONFIG: 'autoGLM-modelConfig',
};

// Simple base64 encoding/decoding for API key obfuscation
// Note: This is not true encryption, just obfuscation to prevent casual viewing
const obfuscate = (str: string): string => {
  return btoa(encodeURIComponent(str));
};

const deobfuscate = (str: string): string => {
  try {
    return decodeURIComponent(atob(str));
  } catch {
    return str;
  }
};

// Load initial state from localStorage
const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') {
    return defaultValue;
  }
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    const parsed = JSON.parse(item);

    // Deobfuscate apiKey if present
    if (key === STORAGE_KEYS.MODEL_CONFIG && parsed && parsed.apiKey) {
      parsed.apiKey = deobfuscate(parsed.apiKey);
    }

    return parsed;
  } catch (e) {
    console.error(`Failed to load ${key} from localStorage:`, e);
    return defaultValue;
  }
};

// Save state to localStorage
const saveToStorage = <T>(key: string, value: T): void => {
  if (typeof window === 'undefined') return;
  try {
    // Obfuscate apiKey before saving
    if (key === STORAGE_KEYS.MODEL_CONFIG && value) {
      const valueToSave = { ...(value as any) };
      if (valueToSave.apiKey) {
        valueToSave.apiKey = obfuscate(valueToSave.apiKey);
      }
      localStorage.setItem(key, JSON.stringify(valueToSave));
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (e) {
    console.error(`Failed to save ${key} to localStorage:`, e);
  }
};

export const useAgentStore = create<AgentStore>((set, get) => ({
  // Initial State - load from localStorage
  logs: [],
  status: TaskStatus.IDLE,
  currentTask: null,
  maxLogs: DEFAULT_MAX_LOGS,
  ws: null,
  isConnected: false,
  error: null,
  theme: loadFromStorage(STORAGE_KEYS.THEME, 'dark' as 'dark' | 'light'),
  modelConfig: loadFromStorage(STORAGE_KEYS.MODEL_CONFIG, null as ModelConfig | null),

  // Log Actions
  addLog: (level: LogLevel, message: string) => {
    set((state) => {
      const newLog: LogItem = {
        id: generateId(),
        timestamp: formatTimestamp(),
        level,
        message,
      };

      // Append new log and trim if exceeding max
      const updatedLogs = [...state.logs, newLog];
      if (updatedLogs.length > state.maxLogs) {
        updatedLogs.shift(); // Remove oldest log
      }

      return { logs: updatedLogs };
    });
  },

  clearLogs: () => {
    set({ logs: [] });
  },

  setMaxLogs: (max: number) => {
    set({ maxLogs: max });
  },

  // Status Actions
  setStatus: (status: TaskStatus) => {
    set({ status });
  },

  setCurrentTask: (task: string | null) => {
    set({ currentTask: task });
  },

  // WebSocket Actions
  connect: (url: string) => {
    const { ws } = get();

    // Close existing connection if any
    if (ws) {
      get().disconnect();
    }

    try {
      const newWs = new WebSocket(url);

      newWs.onopen = () => {
        set({ isConnected: true, error: null, status: TaskStatus.RUNNING });
        get().addLog('SUCCESS', `Connected to WebSocket: ${url}`);
      };

      newWs.onclose = (event) => {
        set({
          isConnected: false,
          ws: null,
          status: event.code !== 1000 ? TaskStatus.ERROR : TaskStatus.IDLE,
        });
        if (event.code !== 1000) {
          get().addLog('ERROR', `WebSocket disconnected (code: ${event.code})`);
        } else {
          get().addLog('INFO', 'WebSocket connection closed');
        }
      };

      newWs.onerror = () => {
        set({ error: 'WebSocket connection error' });
        get().addLog('ERROR', 'WebSocket connection error occurred');
      };

      newWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle different message types
          if (data.type === 'log') {
            const level: LogLevel = (data.level as LogLevel) || 'INFO';
            get().addLog(level, data.message || data.content || JSON.stringify(data));
          } else if (data.type === 'status') {
            const newStatus = data.status as TaskStatus;
            get().setStatus(newStatus);
            get().addLog('INFO', `Task status: ${newStatus}`);
          } else if (data.type === 'screenshot') {
            // Handle screenshot updates (for VisionCanvas)
            get().addLog('DEBUG', 'Screenshot received');
          } else {
            // Default: treat as log
            const content = typeof data === 'string' ? data : JSON.stringify(data);
            get().addLog('INFO', content);
          }
        } catch {
          // If not JSON, treat as plain log message
          get().addLog('INFO', event.data);
        }
      };

      set({ ws: newWs });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      set({ error: errorMessage, status: TaskStatus.ERROR });
      get().addLog('ERROR', `Failed to connect: ${errorMessage}`);
    }
  },

  disconnect: () => {
    const { ws } = get();
    if (ws) {
      ws.onopen = null;
      ws.onclose = null;
      ws.onerror = null;
      ws.onmessage = null;
      ws.close(1000, 'Client disconnected');
      set({ ws: null, isConnected: false });
    }
  },

  reconnect: (url: string) => {
    get().disconnect();
    setTimeout(() => {
      get().connect(url);
    }, 1000);
  },

  // Theme Actions
  setTheme: (theme: 'dark' | 'light') => {
    document.documentElement.setAttribute('data-theme', theme);
    saveToStorage(STORAGE_KEYS.THEME, theme);
    set({ theme });
  },

  toggleTheme: () => {
    const currentTheme = get().theme;
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    saveToStorage(STORAGE_KEYS.THEME, newTheme);
    set({ theme: newTheme });
  },

  // Model Config Actions
  setModelConfig: (config: ModelConfig | null) => {
    saveToStorage(STORAGE_KEYS.MODEL_CONFIG, config);
    set({ modelConfig: config });
    if (config) {
      get().addLog('SUCCESS', `模型配置已保存：${config.provider}`);
    }
  },
}));

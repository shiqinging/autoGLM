import { useState } from 'react';
import { TaskForm } from '@/components/TaskForm';
import { TerminalPanel } from '@/components/TerminalPanel';
import { ModelConfigModal } from '@/components/ModelConfigModal';
import { useAgentStore } from '@/store/useAgentStore';
import { Zap, Activity, Moon, Sun } from 'lucide-react';

function App() {
  const { status, logs, theme, toggleTheme } = useAgentStore();
  const [showConfigModal, setShowConfigModal] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-4 md:p-6 lg:p-8 transition-colors duration-300">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Subtle orange glow from top-right */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        {/* Subtle orange glow from bottom-left */}
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-[1800px] mx-auto">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/30 glow-orange">
                <Zap className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                  Open-AutoGLM
                </h1>
                <p className="text-sm text-[var(--text-secondary)]">
                  可视化控制面板
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Log Count */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)]">
                <Activity className="w-4 h-4 text-[var(--text-muted)]" />
                <span className="text-xs text-[var(--text-secondary)]">
                  {logs.length} 条日志
                </span>
              </div>

              {/* Status Indicator */}
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-full border ${
                  status === 'running'
                    ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                    : status === 'error'
                    ? 'bg-red-500/10 border-red-500/30 text-red-400'
                    : status === 'completed'
                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                    : 'bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-secondary)]'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    status === 'running'
                      ? 'bg-orange-500 animate-pulse'
                      : status === 'error'
                      ? 'bg-red-500'
                      : status === 'completed'
                      ? 'bg-green-500'
                      : 'bg-[var(--text-muted)]'
                  }`}
                />
                <span className="text-sm font-medium capitalize">
                  {status === 'idle' && '空闲'}
                  {status === 'running' && '运行中'}
                  {status === 'paused' && '已暂停'}
                  {status === 'completed' && '已完成'}
                  {status === 'error' && '错误'}
                </span>
              </div>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-secondary)] transition-colors"
                title="切换主题"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-[var(--text-secondary)]" />
                ) : (
                  <Moon className="w-4 h-4 text-[var(--text-secondary)]" />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Main Layout - Wider, no VisionCanvas */}
        <main className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Task Configuration - Full width on mobile, half on desktop */}
          <section className="lg:col-span-1 min-h-[500px]">
            <TaskForm
              websocketUrl="ws://localhost:8080/ws"
              onTaskStart={(data) => {
                console.log('任务开始:', data);
              }}
              onTaskStop={() => {
                console.log('任务停止');
              }}
              onOpenConfig={() => setShowConfigModal(true)}
            />
          </section>

          {/* Terminal Panel - Full width on mobile, half on desktop */}
          <section className="lg:col-span-1 min-h-[500px]">
            <TerminalPanel />
          </section>
        </main>

        {/* Footer */}
        <footer className="mt-8 text-center">
          <p className="text-xs text-[var(--text-secondary)]">
            Open-AutoGLM 控制面板 &bull; 多模态 AI 驱动
          </p>
        </footer>
      </div>

      {/* Model Config Modal */}
      <ModelConfigModal
        open={showConfigModal}
        onOpenChange={setShowConfigModal}
      />
    </div>
  );
}

export default App;

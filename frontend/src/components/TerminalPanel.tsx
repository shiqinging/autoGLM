import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useAgentStore, type LogLevel } from '@/store/useAgentStore';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';
import { Terminal as TerminalIcon, Trash2, Copy, CheckCheck, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// Log level styling configuration
const getLogLevelStyles = (level: LogLevel): string => {
  const styles: Record<LogLevel, string> = {
    INFO: 'text-[var(--log-info)]',
    ACTION: 'text-[var(--log-action)] font-semibold',
    ERROR: 'text-[var(--log-error)] font-semibold',
    SUCCESS: 'text-[var(--log-success)] font-semibold',
    DEBUG: 'text-[var(--text-muted)]',
  };
  return styles[level] || styles.INFO;
};

// Log level badge background
const getLevelBadgeBg = (level: LogLevel): string => {
  const backgrounds: Record<LogLevel, string> = {
    INFO: 'bg-[var(--bg-tertiary)]',
    ACTION: 'bg-orange-500/20',
    ERROR: 'bg-red-500/20',
    SUCCESS: 'bg-green-500/20',
    DEBUG: 'bg-[var(--bg-secondary)]',
  };
  return backgrounds[level] || backgrounds.INFO;
};

interface LogLineProps {
  log: {
    id: string;
    timestamp: string;
    level: LogLevel;
    message: string;
  };
  onCopy: (text: string) => void;
}

// Memoized Log Line Component for performance
const LogLine = React.memo<LogLineProps>(({ log, onCopy }) => {
  const levelStyles = getLogLevelStyles(log.level);
  const badgeBg = getLevelBadgeBg(log.level);

  const handleCopy = useCallback(() => {
    onCopy(`${log.timestamp} [${log.level}] ${log.message}`);
  }, [log, onCopy]);

  // Format timestamp for display
  const formattedTime = new Date(log.timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  });

  return (
    <div
      className="group flex items-start gap-2 py-1.5 px-2 hover:bg-[var(--bg-secondary)] rounded cursor-pointer transition-colors duration-100"
      onClick={handleCopy}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleCopy();
        }
      }}
    >
      {/* Timestamp */}
      <span className="text-[var(--text-muted)] text-xs font-mono whitespace-nowrap select-none">
        {formattedTime}
      </span>

      {/* Level Badge */}
      <span
        className={cn(
          'text-[10px] font-mono px-1.5 py-0.5 rounded select-none',
          badgeBg,
          levelStyles
        )}
      >
        [{log.level}]
      </span>

      {/* Message */}
      <span className={cn('text-sm font-mono flex-1 break-all', levelStyles)}>
        {log.message}
      </span>

      {/* Copy Indicator (visible on hover) */}
      <Copy className="w-3.5 h-3.5 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0" />
    </div>
  );
});

LogLine.displayName = 'LogLine';

interface TerminalPanelProps {
  className?: string;
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({ className }) => {
  const { logs, clearLogs } = useAgentStore();
  const logsEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const isScrolledToBottom = scrollHeight - scrollTop - clientHeight < 50;

      // Only auto-scroll if already near bottom
      if (isScrolledToBottom) {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      } else {
        // Show scroll button if not at bottom
        setShowScrollButton(true);
      }
    }
  }, [logs]);

  // Check scroll position
  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const isScrolledToBottom = scrollHeight - scrollTop - clientHeight < 50;
      setShowScrollButton(!isScrolledToBottom);
    }
  }, []);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollButton(false);
  }, []);

  // Copy to clipboard
  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(text);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedId(text);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }, []);

  // Clear logs with confirmation
  const handleClearLogs = useCallback(() => {
    if (logs.length === 0) return;

    const confirmed = window.confirm('确定要清空所有日志吗？');
    if (confirmed) {
      clearLogs();
    }
  }, [logs.length, clearLogs]);

  return (
    <Card className={cn('w-full h-full flex flex-col glass border-[var(--border)]', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)]">
              <TerminalIcon className="w-4 h-4 text-orange-500" />
            </div>
            <div>
              <CardTitle className="text-[var(--text-primary)] text-base">
                实时日志
              </CardTitle>
              <p className="text-xs text-[var(--text-secondary)]">
                {logs.length} 条日志
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearLogs}
              disabled={logs.length === 0}
              className="h-8 text-xs hover:bg-red-500/10 hover:text-red-400"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              清空
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 p-0">
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto bg-[var(--bg-input)] rounded-md border border-[var(--border)] p-3 font-mono"
          style={{
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
          }}
        >
          {logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)]">
              <TerminalIcon className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm">暂无日志</p>
              <p className="text-xs mt-1">启动任务后查看实时日志</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {logs.map((log) => (
                <LogLine key={log.id} log={log} onCopy={handleCopy} />
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>

        {/* Scroll to Bottom Button */}
        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs rounded-md shadow-lg transition-colors duration-150 z-10"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            最新
          </button>
        )}
      </CardContent>

      {/* Toast for copy feedback */}
      {copiedId && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-light)] rounded-md shadow-xl text-sm text-[var(--text-primary)] animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCheck className="w-4 h-4 text-green-400" />
          已复制到剪贴板
        </div>
      )}
    </Card>
  );
};

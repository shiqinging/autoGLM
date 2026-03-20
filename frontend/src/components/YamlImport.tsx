import React, { useRef, useState, useCallback } from 'react';
import { useAgentStore } from '@/store/useAgentStore';
import { Button, Textarea } from '@/components/ui';
import { Upload, Sparkles, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface YamlImportProps {
  onTaskStart?: (yamlContent: string, fileName?: string) => void;
}

interface ParsedTask {
  name: string;
  target?: string;
  description?: string;
  steps?: Array<{
    action: string;
    params?: Record<string, unknown>;
  }>;
  model?: string;
  maxSteps?: number;
}

// Simple Label component for local use
const Label: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className,
  children,
}) => (
  <label className={cn('text-sm font-medium text-[var(--text-label)]', className)}>
    {children}
  </label>
);

export const YamlImport: React.FC<YamlImportProps> = ({ onTaskStart }) => {
  const { addLog, status } = useAgentStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [yamlContent, setYamlContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [parsedTask, setParsedTask] = useState<ParsedTask | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const isRunning = status === 'running';

  // Simple YAML parser (for basic task definitions)
  const parseYaml = useCallback((content: string): ParsedTask => {
    const task: ParsedTask = {
      name: '未命名任务',
      steps: [],
    };

    const lines = content.split('\n');
    let currentSection: keyof ParsedTask | null = null;
    let currentStep: Partial<NonNullable<ParsedTask['steps']>[number]> | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Top-level keys
      if (line.startsWith('name:')) {
        task.name = line.split(':')[1]?.trim().replace(/['"]/g, '') || '未命名任务';
      } else if (line.startsWith('target:')) {
        task.target = line.split(':')[1]?.trim().replace(/['"]/g, '');
      } else if (line.startsWith('description:')) {
        task.description = line.split(':')[1]?.trim().replace(/['"]/g, '');
      } else if (line.startsWith('model:')) {
        task.model = line.split(':')[1]?.trim().replace(/['"]/g, '');
      } else if (line.startsWith('maxSteps:')) {
        task.maxSteps = parseInt(line.split(':')[1]?.trim() || '50', 10);
      } else if (line.startsWith('steps:')) {
        currentSection = 'steps';
      } else if (currentSection === 'steps' && trimmed.startsWith('- action:')) {
        if (currentStep) {
          task.steps?.push(currentStep as NonNullable<ParsedTask['steps']>[number]);
        }
        currentStep = {
          action: trimmed.split(':')[1]?.trim().replace(/['"]/g, '') || '',
        };
      } else if (currentSection === 'steps' && trimmed.startsWith('params:')) {
        // Simple params parsing
        currentStep = currentStep || { action: 'unknown' };
        currentStep.params = {};
      }

      // Handle nested items
      if (currentSection === 'steps' && trimmed.startsWith('- coordinate:')) {
        const coord = trimmed.split(':')[1]?.trim();
        if (coord && currentStep) {
          const [x, y] = coord.split(',').map((n) => parseInt(n.trim(), 10));
          currentStep.params = { ...currentStep.params, x, y };
        }
      }
    }

    // Push last step
    if (currentStep && currentSection === 'steps') {
      task.steps?.push(currentStep as NonNullable<ParsedTask['steps']>[number]);
    }

    return task;
  }, []);

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.name.endsWith('.yaml') && !file.name.endsWith('.yml')) {
        setParseError('请上传 .yaml 或 .yml 文件');
        addLog('ERROR', '文件格式错误：仅支持 YAML 文件');
        return;
      }

      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setYamlContent(content);

        try {
          const parsed = parseYaml(content);
          setParsedTask(parsed);
          setParseError(null);
          addLog('SUCCESS', `已加载任务文件：${file.name}`);
          addLog('INFO', `任务名称：${parsed.name}`);
          addLog('INFO', `步骤数量：${parsed.steps?.length || 0}`);
        } catch {
          setParseError('YAML 解析失败，请检查文件格式');
          addLog('ERROR', 'YAML 解析失败');
        }
      };
      reader.onerror = () => {
        setParseError('文件读取失败');
        addLog('ERROR', '文件读取失败');
      };
      reader.readAsText(file);

      // Reset input
      event.target.value = '';
    },
    [parseYaml, addLog]
  );

  const handleExecute = () => {
    if (!yamlContent.trim()) {
      setParseError('请先上传或输入 YAML 内容');
      addLog('ERROR', 'YAML 内容为空');
      return;
    }

    addLog('ACTION', `开始执行任务：${parsedTask?.name || '未命名任务'}`);
    addLog('INFO', `文件：${fileName || '手动输入'}`);
    onTaskStart?.(yamlContent, fileName);
  };

  const handleClear = () => {
    setYamlContent('');
    setFileName('');
    setParsedTask(null);
    setParseError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    addLog('INFO', '已清空 YAML 内容');
  };

  return (
    <div className="space-y-4">
      {/* File Upload Area */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
          'hover:border-orange-500/50 hover:bg-orange-500/5 cursor-pointer',
          parseError ? 'border-red-500/50 bg-red-500/5' : 'border-[var(--border)]'
        )}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (file && fileInputRef.current) {
            const event = { target: { files: [file], value: '' } } as unknown as React.ChangeEvent<HTMLInputElement>;
            handleFileUpload(event);
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".yaml,.yml"
          onChange={handleFileUpload}
          className="hidden"
          disabled={isRunning}
        />
        <Upload className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
        <p className="text-sm text-[var(--text-secondary)]">
          点击上传或拖拽 YAML 文件到此处
        </p>
        {fileName && (
          <p className="text-xs text-orange-500 mt-2">已选择：{fileName}</p>
        )}
      </div>

      {/* YAML Content Editor */}
      <div className="space-y-2">
        <Label>或直接输入 YAML 内容：</Label>
        <Textarea
          value={yamlContent}
          onChange={(e) => setYamlContent(e.target.value)}
          placeholder={`name: 示例任务
target: https://example.com
description: 这是一个示例任务
maxSteps: 50
steps:
  - action: click
    params:
      x: 100
      y: 200`}
          className="min-h-[150px] font-mono text-sm bg-[var(--bg-input)] resize-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
          disabled={isRunning}
        />
      </div>

      {/* Parsed Task Preview */}
      {parsedTask && (
        <div className="border border-[var(--border)] rounded-lg p-3 bg-[var(--bg-secondary)]">
          <p className="text-xs text-[var(--text-secondary)] mb-2">任务预览</p>
          <div className="space-y-1">
            <p className="text-sm text-[var(--text-primary)]">
              <span className="text-[var(--text-muted)]">名称:</span> {parsedTask.name}
            </p>
            {parsedTask.target && (
              <p className="text-sm text-[var(--text-primary)]">
                <span className="text-[var(--text-muted)]">目标:</span> {parsedTask.target}
              </p>
            )}
            {parsedTask.steps && parsedTask.steps.length > 0 && (
              <p className="text-sm text-[var(--text-primary)]">
                <span className="text-[var(--text-muted)]">步骤:</span> {parsedTask.steps.length} 个操作
              </p>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {parseError && (
        <div className="border border-red-500/30 bg-red-500/10 rounded-lg p-3">
          <p className="text-sm text-red-400">{parseError}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          onClick={handleClear}
          disabled={!yamlContent && !fileName}
          className="flex-1"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          清空
        </Button>
        <Button
          variant="default"
          onClick={handleExecute}
          className="flex-1 glow-orange"
          loading={isRunning}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          执行任务
        </Button>
      </div>
    </div>
  );
};

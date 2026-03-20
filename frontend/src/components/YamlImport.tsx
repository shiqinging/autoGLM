import React, { useRef, useState, useCallback } from 'react';
import { useAgentStore } from '@/store/useAgentStore';
import { Button, Input, Select } from '@/components/ui';
import { Upload, Sparkles, Trash2, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface YamlImportProps {
  onTaskStart?: (yamlContent: string, fileName?: string) => void;
}

interface Step {
  action: string;
  params?: Record<string, unknown>;
}

interface ParsedTask {
  name: string;
  target?: string;
  description?: string;
  steps?: Step[];
  model?: string;
  maxSteps?: number;
}

// Action options for dropdown
const ACTION_OPTIONS = [
  { value: 'click', label: '点击 (Click)' },
  { value: 'type', label: '输入 (Type)' },
  { value: 'scroll', label: '滚动 (Scroll)' },
  { value: 'navigate', label: '导航 (Navigate)' },
  { value: 'wait', label: '等待 (Wait)' },
  { value: 'screenshot', label: '截图 (Screenshot)' },
];

// Model options for dropdown
const MODEL_OPTIONS = [
  { value: 'glm-4v', label: 'GLM-4V' },
  { value: 'glm-4', label: 'GLM-4' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
];

// Simple Label component for local use
const Label: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className,
  children,
}) => (
  <label className={cn('text-sm font-medium text-[var(--text-label)]', className)}>
    {children}
  </label>
);

// Simple YAML parser
const parseYaml = (content: string): ParsedTask => {
  const task: ParsedTask = {
    name: '未命名任务',
    steps: [],
  };

  const lines = content.split('\n');
  let currentSection: keyof ParsedTask | null = null;
  let currentStep: Partial<Step> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

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
        task.steps?.push(currentStep as Step);
      }
      currentStep = {
        action: trimmed.split(':')[1]?.trim().replace(/['"]/g, '') || '',
      };
    } else if (currentSection === 'steps' && trimmed.startsWith('params:')) {
      currentStep = currentStep || { action: 'unknown' };
      currentStep.params = {};
    }

    if (currentSection === 'steps' && trimmed.startsWith('- coordinate:')) {
      const coord = trimmed.split(':')[1]?.trim();
      if (coord && currentStep) {
        const [x, y] = coord.split(',').map((n) => parseInt(n.trim(), 10));
        currentStep.params = { ...currentStep.params, x, y };
      }
    }
  }

  if (currentStep && currentSection === 'steps') {
    task.steps?.push(currentStep as Step);
  }

  return task;
};

// Generate YAML from form data
const generateYaml = (task: ParsedTask): string => {
  let yaml = `name: ${task.name}\n`;
  if (task.target) yaml += `target: ${task.target}\n`;
  if (task.description) yaml += `description: ${task.description}\n`;
  if (task.model) yaml += `model: ${task.model}\n`;
  if (task.maxSteps) yaml += `maxSteps: ${task.maxSteps}\n`;

  if (task.steps && task.steps.length > 0) {
    yaml += 'steps:\n';
    task.steps.forEach((step) => {
      yaml += `  - action: ${step.action}\n`;
      if (step.params && Object.keys(step.params).length > 0) {
        yaml += '    params:\n';
        Object.entries(step.params).forEach(([key, value]) => {
          yaml += `      ${key}: ${value}\n`;
        });
      }
    });
  }

  return yaml;
};

export const YamlImport: React.FC<YamlImportProps> = ({ onTaskStart }) => {
  const { addLog, status } = useAgentStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [parsedTask, setParsedTask] = useState<ParsedTask>({
    name: '',
    target: '',
    description: '',
    model: 'glm-4v',
    maxSteps: 50,
    steps: [],
  });
  const [parseError, setParseError] = useState<string | null>(null);
  const [hasContent, setHasContent] = useState(false);

  const isRunning = status === 'running';

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

        try {
          const parsed = parseYaml(content);
          setParsedTask(parsed);
          setParseError(null);
          setHasContent(true);
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

      event.target.value = '';
    },
    [addLog]
  );

  const updateTask = useCallback((updates: Partial<ParsedTask>) => {
    setParsedTask((prev) => ({ ...prev, ...updates }));
  }, []);

  const addStep = useCallback(() => {
    setParsedTask((prev) => ({
      ...prev,
      steps: [...(prev.steps || []), { action: 'click', params: {} }],
    }));
  }, []);

  const updateStep = useCallback((index: number, updates: Partial<Step>) => {
    setParsedTask((prev) => ({
      ...prev,
      steps: prev.steps?.map((step, i) => (i === index ? { ...step, ...updates } : step)),
    }));
  }, []);

  const removeStep = useCallback((index: number) => {
    setParsedTask((prev) => ({
      ...prev,
      steps: prev.steps?.filter((_, i) => i !== index),
    }));
  }, []);

  const handleExecute = () => {
    const yamlContent = generateYaml(parsedTask);
    addLog('ACTION', `开始执行任务：${parsedTask.name}`);
    addLog('INFO', `文件：${fileName || '手动输入'}`);
    onTaskStart?.(yamlContent, fileName);
  };

  const handleClear = () => {
    setParsedTask({
      name: '',
      target: '',
      description: '',
      model: 'glm-4v',
      maxSteps: 50,
      steps: [],
    });
    setFileName('');
    setParseError(null);
    setHasContent(false);
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

      {/* Form Fields */}
      <div className="space-y-4">
        {/* Task Name */}
        <div className="space-y-2">
          <Label>任务名称</Label>
          <Input
            value={parsedTask.name}
            onChange={(e) => updateTask({ name: e.target.value })}
            placeholder="输入任务名称"
            disabled={isRunning}
          />
        </div>

        {/* Target URL */}
        <div className="space-y-2">
          <Label>目标 URL</Label>
          <Input
            value={parsedTask.target || ''}
            onChange={(e) => updateTask({ target: e.target.value })}
            placeholder="https://example.com"
            disabled={isRunning}
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label>任务描述</Label>
          <Input
            value={parsedTask.description || ''}
            onChange={(e) => updateTask({ description: e.target.value })}
            placeholder="描述任务目标"
            disabled={isRunning}
          />
        </div>

        {/* Model Selection */}
        <div className="space-y-2">
          <Label>AI 模型</Label>
          <Select
            value={parsedTask.model || 'glm-4v'}
            onChange={(e) => updateTask({ model: e.target.value })}
            options={MODEL_OPTIONS}
            disabled={isRunning}
          />
        </div>

        {/* Max Steps */}
        <div className="space-y-2">
          <Label>最大步骤数</Label>
          <Input
            type="number"
            value={parsedTask.maxSteps || 50}
            onChange={(e) => updateTask({ maxSteps: parseInt(e.target.value) || 50 })}
            disabled={isRunning}
          />
        </div>

        {/* Steps Section */}
        <div className="space-y-3 pt-4 border-t border-[var(--border)]">
          <div className="flex items-center justify-between">
            <Label>执行步骤</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addStep}
              disabled={isRunning}
              className="h-8"
            >
              <Plus className="w-4 h-4 mr-1" />
              添加步骤
            </Button>
          </div>

          {parsedTask.steps && parsedTask.steps.length > 0 ? (
            <div className="space-y-3">
              {parsedTask.steps.map((step, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]"
                >
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--bg-tertiary)] text-xs text-[var(--text-secondary)]">
                    {index + 1}
                  </span>
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <Select
                      value={step.action}
                      onChange={(e) => updateStep(index, { action: e.target.value })}
                      options={ACTION_OPTIONS}
                      disabled={isRunning}
                    />
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="X"
                        value={(step.params?.x as number) || ''}
                        onChange={(e) =>
                          updateStep(index, {
                            params: { ...step.params, x: parseInt(e.target.value) || 0 },
                          })
                        }
                        disabled={isRunning}
                        className="w-20"
                      />
                      <Input
                        type="number"
                        placeholder="Y"
                        value={(step.params?.y as number) || ''}
                        onChange={(e) =>
                          updateStep(index, {
                            params: { ...step.params, y: parseInt(e.target.value) || 0 },
                          })
                        }
                        disabled={isRunning}
                        className="w-20"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeStep(index)}
                    disabled={isRunning}
                    className="h-10 w-10 shrink-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[var(--text-muted)] text-sm border border-dashed border-[var(--border)] rounded-lg">
              暂无步骤，点击"添加步骤"按钮添加
            </div>
          )}
        </div>
      </div>

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
          disabled={!hasContent && parsedTask.steps?.length === 0}
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

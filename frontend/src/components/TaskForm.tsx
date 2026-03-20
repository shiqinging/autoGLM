import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAgentStore } from '@/store/useAgentStore';
import {
  Card,
  CardHeader,
  CardTitle,
  CardFooter,
  Button,
  Textarea,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui';
import { YamlImport } from './YamlImport';
import { Terminal, Sparkles, Loader2, Settings } from 'lucide-react';

// Form Validation Schema - 只保留任务描述
const taskFormSchema = z.object({
  taskDescription: z
    .string()
    .min(5, '任务描述至少 5 个字符')
    .max(1000, '任务描述不能超过 1000 个字符'),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

// Default Values
const defaultValues: Partial<TaskFormValues> = {
  taskDescription: '',
};

interface TaskFormProps {
  websocketUrl?: string;
  onTaskStart?: (data: TaskFormValues | { type: 'yaml'; content: string; fileName?: string }) => void;
  onTaskStop?: () => void;
  onOpenConfig?: () => void;
}

export const TaskForm: React.FC<TaskFormProps> = ({
  websocketUrl = 'ws://localhost:8080/ws',
  onTaskStart,
  onTaskStop,
  onOpenConfig,
}) => {
  const { status, connect, disconnect, addLog, setCurrentTask, modelConfig } = useAgentStore();
  const isRunning = status === 'running';
  const [activeTab, setActiveTab] = useState<'manual' | 'yaml'>('manual');

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues,
  });

  const onSubmit = async (data: TaskFormValues) => {
    if (isRunning) {
      // Stop current task
      disconnect();
      addLog('INFO', '任务已被用户停止');
      setCurrentTask(null);
      onTaskStop?.();
      reset();
    } else {
      // Check if model is configured
      if (!modelConfig) {
        addLog('ERROR', '请先配置模型连接');
        onOpenConfig?.();
        return;
      }

      // Start new task
      addLog('ACTION', `开始执行任务：${data.taskDescription}`);
      addLog('INFO', `使用 Provider: ${modelConfig.provider}`);

      // Connect to WebSocket
      connect(websocketUrl);

      // Update current task in store
      setCurrentTask(data.taskDescription);

      // Call parent callback if provided
      onTaskStart?.(data);
    }
  };

  const handleYamlStart = (content: string, fileName?: string) => {
    if (!modelConfig) {
      addLog('ERROR', '请先配置模型连接');
      onOpenConfig?.();
      return;
    }

    addLog('ACTION', `开始执行 YAML 任务`);
    addLog('INFO', `文件：${fileName || '手动输入'}`);
    addLog('INFO', `使用 Provider: ${modelConfig.provider}`);

    connect(websocketUrl);
    setCurrentTask(fileName || 'YAML 任务');
    onTaskStart?.({ type: 'yaml', content, fileName });
  };

  return (
    <Card className="w-full h-full flex flex-col glass border-[var(--border)]">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/30">
              <Terminal className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <CardTitle className="text-[var(--text-primary)]">任务执行</CardTitle>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">配置并启动自动化任务</p>
            </div>
          </div>

          {/* Model Config Button */}
          <button
            onClick={onOpenConfig}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border-light)] hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <Settings className="w-4 h-4 text-[var(--text-secondary)]" />
            <span className="text-xs text-[var(--text-secondary)]">
              {modelConfig ? `已连接：${modelConfig.provider}` : '未配置'}
            </span>
          </button>
        </div>

        {/* Tab Panel */}
        <div className="mt-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'manual' | 'yaml')}>
            <TabsList className="w-full">
              <TabsTrigger value="manual">手动输入</TabsTrigger>
              <TabsTrigger value="yaml">YAML 导入</TabsTrigger>
            </TabsList>

            <TabsContent value="manual">
              <form id="task-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
                {/* Task Description */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--text-label)]">任务描述</label>
                  <Controller
                    name="taskDescription"
                    control={control}
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        placeholder="描述您希望代理执行的操作，例如：打开微信并发送消息给张三"
                        disabled={isRunning}
                        className="min-h-[120px] disabled:opacity-60 resize-none"
                      />
                    )}
                  />
                  {errors.taskDescription && (
                    <p className="text-xs text-red-500 mt-1">{errors.taskDescription.message}</p>
                  )}
                </div>
              </form>
            </TabsContent>

            <TabsContent value="yaml">
              <div className="mt-4">
                <YamlImport onTaskStart={handleYamlStart} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </CardHeader>

      <CardFooter>
        {activeTab === 'manual' && (
          <Button
            type="submit"
            form="task-form"
            variant={isRunning ? 'destructive' : 'default'}
            className="w-full h-12 text-base font-medium glow-orange"
            loading={isSubmitting}
          >
            {isRunning ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                停止任务
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                开始任务
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

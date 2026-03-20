import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAgentStore } from '@/store/useAgentStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
  Select,
} from '@/components/ui';
import { Settings, Plug, X } from 'lucide-react';

// Form Validation Schema
const modelConfigSchema = z.object({
  provider: z.enum(['zhipu', 'openai', 'anthropic']),
  apiKey: z.string().min(1, 'API Key 不能为空'),
  baseUrl: z.string().url('请输入有效的 URL'),
  model: z.string().min(1, '模型名称不能为空'),
});

type ModelConfigValues = z.infer<typeof modelConfigSchema>;

// Provider options
const providerOptions = [
  { value: 'zhipu', label: '智普 AI' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
];

// Default values for each provider
const providerDefaults: Record<string, { baseUrl: string; model: string }> = {
  zhipu: {
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4v',
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o',
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-sonnet-4-20250514',
  },
};

interface ModelConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ModelConfigModal: React.FC<ModelConfigModalProps> = ({ open, onOpenChange }) => {
  const { setModelConfig, addLog, modelConfig } = useAgentStore();

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<ModelConfigValues>({
    resolver: zodResolver(modelConfigSchema),
    defaultValues: {
      provider: 'zhipu',
      apiKey: '',
      baseUrl: providerDefaults.zhipu.baseUrl,
      model: providerDefaults.zhipu.model,
    },
  });

  const provider = watch('provider');

  // Load saved config when modal opens
  React.useEffect(() => {
    if (open && modelConfig) {
      reset({
        provider: modelConfig.provider,
        apiKey: modelConfig.apiKey,
        baseUrl: modelConfig.baseUrl,
        model: modelConfig.model,
      });
    }
  }, [open, modelConfig, reset]);

  // Update baseUrl and model when provider changes
  React.useEffect(() => {
    if (provider && providerDefaults[provider]) {
      setValue('baseUrl', providerDefaults[provider].baseUrl);
      setValue('model', providerDefaults[provider].model);
    }
  }, [provider, setValue]);

  const onSubmit = (data: ModelConfigValues) => {
    setModelConfig(data);
    addLog('SUCCESS', `已配置模型 provider: ${data.provider}, 模型：${data.model}`);
    onOpenChange(false);
  };

  const handleConnect = () => {
    addLog('ACTION', `正在连接到 ${providerOptions.find(p => p.value === provider)?.label}...`);
    handleSubmit(onSubmit)();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-[var(--border)]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/30">
                <Settings className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <DialogTitle className="text-[var(--text-primary)]">模型配置</DialogTitle>
                <DialogDescription className="text-[var(--text-secondary)]">配置 AI 模型连接参数</DialogDescription>
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-5 py-4 px-6">
            {/* Provider Selection */}
            <div className="space-y-2">
              <Label htmlFor="provider">模型 Provider</Label>
              <Controller
                name="provider"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    id="provider"
                    options={providerOptions}
                  />
                )}
              />
              {errors.provider && (
                <p className="text-xs text-red-500 mt-1">{errors.provider.message}</p>
              )}
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Controller
                name="apiKey"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="apiKey"
                    type="password"
                    placeholder="输入您的 API Key"
                  />
                )}
              />
              {errors.apiKey && (
                <p className="text-xs text-red-500 mt-1">{errors.apiKey.message}</p>
              )}
            </div>

            {/* Base URL */}
            <div className="space-y-2">
              <Label htmlFor="baseUrl">API Base URL</Label>
              <Controller
                name="baseUrl"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="baseUrl"
                    type="url"
                    placeholder="https://api.example.com"
                  />
                )}
              />
              {errors.baseUrl && (
                <p className="text-xs text-red-500 mt-1">{errors.baseUrl.message}</p>
              )}
            </div>

            {/* Model Name */}
            <div className="space-y-2">
              <Label htmlFor="model">模型名称</Label>
              <Controller
                name="model"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="model"
                    placeholder="例如：glm-4v"
                  />
                )}
              />
              {errors.model && (
                <p className="text-xs text-red-500 mt-1">{errors.model.message}</p>
              )}
            </div>
          </div>

          <DialogFooter className="px-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button
              type="submit"
              variant="default"
              className="glow-orange"
              onClick={handleConnect}
            >
              <Plug className="w-4 h-4 mr-2" />
              连接服务
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

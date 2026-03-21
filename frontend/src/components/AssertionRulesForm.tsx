import React, { useState, useCallback } from 'react';
import { Button, Input, Select } from '@/components/ui';
import { Plus, X, ChevronRight, ChevronDown, Save, FileText, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============ Type Definitions ============
interface FailureIndicator {
  id: string;
  text: string;
}

interface SuccessIndicator {
  id: string;
  text: string;
}

interface ScreenElement {
  id: string;
  name: string;
}

interface Condition {
  id: string;
  text: string;
}

interface ActionRule {
  id: string;
  actionType: string;
  description: string;
  correctConditions: Condition[];
  incorrectConditions: Condition[];
  expectedElements: ScreenElement[];
  forbiddenElements: ScreenElement[];
  confidenceThreshold: number;
}

interface StepRule {
  id: string;
  stepName: string;
  stepDescription: string;
  actionSequence: string[];
  successCriteria: Condition[];
  failureIndicators: Condition[];
  intermediateChecks: { checkpoint: string; checks: Condition[] }[];
}

interface GlobalRules {
  appName: string;
  testSuite: string;
  defaultConfidenceThreshold: number;
  timeoutSeconds: number;
  commonFailureIndicators: FailureIndicator[];
  commonSuccessIndicators: SuccessIndicator[];
}

interface CabinetType {
  id: string;
  name: string;
  priceMin: number;
  priceMax: number;
}

interface ScenarioRules {
  timeConstraints: string[];
  cabinetTypes: CabinetType[];
  requiredFields: string[];
  paymentValidations: string[];
}

interface ErrorRecoveryRule {
  indicators: string[];
  recoveryActions: string[];
}

interface ErrorRecovery {
  networkError: ErrorRecoveryRule;
  pageLoadFailure: ErrorRecoveryRule;
  outOfStock: ErrorRecoveryRule;
}

interface AssertionStrategyItem {
  confidenceThreshold: number;
  timeout: number;
  retryCount: number;
}

// ============ Default Values ============
const ACTION_TYPE_OPTIONS = [
  { value: 'tap', label: '点击 (Tap)' },
  { value: 'swipe', label: '滑动 (Swipe)' },
  { value: 'input', label: '输入 (Input)' },
  { value: 'long_press', label: '长按 (Long Press)' },
  { value: 'wait', label: '等待 (Wait)' },
  { value: 'assert', label: '断言 (Assert)' },
];

const STRATEGY_OPTIONS = [
  { value: 'default', label: '默认策略' },
  { value: 'critical', label: '关键步骤' },
  { value: 'lenient', label: '宽松策略' },
];

const defaultGlobalRules: GlobalRules = {
  appName: '微信小程序',
  testSuite: '无忧存预约下单',
  defaultConfidenceThreshold: 0.7,
  timeoutSeconds: 5,
  commonFailureIndicators: [
    { id: '1', text: '网络错误' },
    { id: '2', text: '加载失败' },
  ],
  commonSuccessIndicators: [
    { id: '1', text: '加载完成' },
    { id: '2', text: '操作成功' },
  ],
};

const defaultScenarioRules: ScenarioRules = {
  timeConstraints: ['9:00-18:00', '工作日'],
  cabinetTypes: [
    { id: '1', name: '常规柜', priceMin: 10, priceMax: 100 },
  ],
  requiredFields: ['手机号', '取件码'],
  paymentValidations: ['微信支付', '支付宝'],
};

const defaultErrorRecovery: ErrorRecovery = {
  networkError: {
    indicators: ['网络连接失败', '请求超时'],
    recoveryActions: ['等待 5 秒后重试', '刷新页面'],
  },
  pageLoadFailure: {
    indicators: ['页面加载失败', '白屏'],
    recoveryActions: ['返回上一页', '重新进入'],
  },
  outOfStock: {
    indicators: ['已售罄', '库存不足'],
    recoveryActions: ['选择其他商品', '结束任务'],
  },
};

const generateId = () => Math.random().toString(36).substr(2, 9);

// ============ Reusable Components ============
const SectionHeader: React.FC<{
  title: string;
  description?: string;
  icon?: React.ReactNode;
  defaultExpanded?: boolean;
  children?: React.ReactNode;
}> = ({ title, description, icon, defaultExpanded = true, children }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--bg-card)]">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 p-4 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500">
          {icon}
        </div>
        <div className="flex-1 text-left">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
          {description && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{description}</p>}
        </div>
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-[var(--text-muted)]" />
        ) : (
          <ChevronRight className="w-5 h-5 text-[var(--text-muted)]" />
        )}
      </button>
      {isExpanded && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );
};

const InputWithAdd: React.FC<{
  items: { id: string; text: string }[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, text: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
}> = ({ items, onAdd, onRemove, onUpdate, placeholder, label, disabled }) => {
  const [newValue, setNewValue] = useState('');

  const handleAdd = () => {
    if (newValue.trim()) {
      onAdd();
      setNewValue('');
    }
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className="flex gap-2">
        <Input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          disabled={disabled}
          className="flex-1"
        />
        <Button type="button" variant="outline" onClick={handleAdd} disabled={!newValue.trim() || disabled}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {items.length > 0 && (
        <div className="space-y-1.5 mt-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-2 p-2 rounded-md bg-[var(--bg-secondary)] border border-[var(--border)]">
              <Input
                value={item.text}
                onChange={(e) => onUpdate(item.id, e.target.value)}
                disabled={disabled}
                className="flex-1 h-8 text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onRemove(item.id)}
                disabled={disabled}
                className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Label: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <label className={cn('text-sm font-medium text-[var(--text-label)]', className)}>
    {children}
  </label>
);

// ============ Main Component ============
export const AssertionRulesForm: React.FC = () => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [globalRules, setGlobalRules] = useState<GlobalRules>(defaultGlobalRules);
  const [actionRules, setActionRules] = useState<ActionRule[]>([]);
  const [stepRules, setStepRules] = useState<StepRule[]>([]);
  const [scenarioRules, setScenarioRules] = useState<ScenarioRules>(defaultScenarioRules);
  const [errorRecovery, setErrorRecovery] = useState<ErrorRecovery>(defaultErrorRecovery);
  const [assertionStrategy, setAssertionStrategy] = useState<Record<string, AssertionStrategyItem>>({
    default: { confidenceThreshold: 0.7, timeout: 3, retryCount: 0 },
    critical: { confidenceThreshold: 0.8, timeout: 5, retryCount: 1 },
    lenient: { confidenceThreshold: 0.6, timeout: 2, retryCount: 0 },
  });

  // Parse YAML content to all rule types
  const parseYamlToRules = useCallback((content: string) => {
    const lines = content.split('\n');
    let currentSection: string | null = null;
    let currentStep: Partial<StepRule> | null = null;
    let currentCheckpoint: string | null = null;
    let currentCheckIndex = -1;
    let currentActionRule: Partial<ActionRule> | null = null;
    let currentErrorSection: keyof ErrorRecovery | null = null;
    let currentIndicatorList: string[] = [];
    let currentActionList: string[] = [];

    // Temp storage for parsed data
    const parsedGlobalRules: Partial<GlobalRules> = {};
    const parsedStepRules: StepRule[] = [];
    const parsedActionRules: ActionRule[] = [];
    const parsedScenarioRules: Partial<ScenarioRules> = {};
    const parsedErrorRecovery: ErrorRecovery = { ...defaultErrorRecovery };
    const parsedStrategy: Record<string, AssertionStrategyItem> = { ...assertionStrategy };

    for (const line of lines) {
      if (!line.trim() || line.trim().startsWith('#')) continue;

      // Detect top-level sections
      if (line.startsWith('global_rules:')) {
        currentSection = 'global_rules';
        continue;
      } else if (line.startsWith('action_rules:')) {
        currentSection = 'action_rules';
        continue;
      } else if (line.startsWith('step_rules:')) {
        currentSection = 'step_rules';
        continue;
      } else if (line.startsWith('scenario_rules:')) {
        currentSection = 'scenario_rules';
        continue;
      } else if (line.startsWith('error_recovery:')) {
        currentSection = 'error_recovery';
        continue;
      } else if (line.startsWith('assertion_strategy:')) {
        currentSection = 'assertion_strategy';
        continue;
      }

      // Parse global_rules
      if (currentSection === 'global_rules') {
        if (line.match(/^    app_name:/)) {
          parsedGlobalRules.appName = line.split(':')[1]?.trim().replace(/['"]/g, '') || '';
        } else if (line.match(/^    test_suite:/)) {
          parsedGlobalRules.testSuite = line.split(':')[1]?.trim().replace(/['"]/g, '') || '';
        } else if (line.match(/^    default_confidence_threshold:/)) {
          parsedGlobalRules.defaultConfidenceThreshold = parseFloat(line.split(':')[1]?.trim()) || 0.7;
        } else if (line.match(/^    timeout_seconds:/)) {
          parsedGlobalRules.timeoutSeconds = parseInt(line.split(':')[1]?.trim()) || 5;
        } else if (line.match(/^    common_failure_indicators:/)) {
          // Will parse items below
        } else if (line.match(/^    common_success_indicators:/)) {
          // Will parse items below
        } else if (line.match(/^      - /) && line.includes('common_failure_indicators')) {
          // Handled in item parsing
        }
      }

      // Parse action_rules
      if (currentSection === 'action_rules') {
        if (line.match(/^  - action_type:/)) {
          if (currentActionRule?.actionType) {
            parsedActionRules.push(currentActionRule as ActionRule);
          }
          currentActionRule = {
            id: generateId(),
            actionType: line.split(':')[1]?.trim().replace(/['"]/g, '') || 'tap',
            description: '',
            correctConditions: [],
            incorrectConditions: [],
            expectedElements: [],
            forbiddenElements: [],
            confidenceThreshold: 0.7,
          };
        } else if (currentActionRule) {
          if (line.match(/^    description:/)) {
            currentActionRule.description = line.split(':')[1]?.trim().replace(/['"]/g, '') || '';
          } else if (line.match(/^    confidence_threshold:/)) {
            currentActionRule.confidenceThreshold = parseFloat(line.split(':')[1]?.trim()) || 0.7;
          } else if (line.match(/^    correct_conditions:/)) {
            currentCheckpoint = 'correct_conditions';
          } else if (line.match(/^    incorrect_conditions:/)) {
            currentCheckpoint = 'incorrect_conditions';
          } else if (line.match(/^      - /) && currentCheckpoint) {
            const item = line.replace(/^      - /, '').trim().replace(/['"]/g, '');
            if (currentCheckpoint === 'correct_conditions') {
              currentActionRule.correctConditions?.push({ id: generateId(), text: item });
            } else if (currentCheckpoint === 'incorrect_conditions') {
              currentActionRule.incorrectConditions?.push({ id: generateId(), text: item });
            }
          }
        }
      }

      // Parse step_rules (existing logic)
      if (currentSection === 'step_rules') {
        if (line.match(/^  - step_name:/)) {
          if (currentStep?.stepName) {
            parsedStepRules.push(currentStep as StepRule);
          }
          currentStep = {
            id: generateId(),
            stepName: line.split(':')[1]?.trim().replace(/['"]/g, '') || '',
            stepDescription: '',
            actionSequence: [],
            successCriteria: [],
            failureIndicators: [],
            intermediateChecks: [],
          };
          currentCheckpoint = null;
          continue;
        }

        if (!currentStep) continue;

        if (line.match(/^    step_description:/)) {
          currentStep.stepDescription = line.split(':')[1]?.trim().replace(/['"]/g, '') || '';
        } else if (line.match(/^    action_sequence:/)) {
          currentCheckpoint = 'action_sequence';
        } else if (line.match(/^    success_criteria:/)) {
          currentCheckpoint = 'success_criteria';
        } else if (line.match(/^    failure_indicators:/)) {
          currentCheckpoint = 'failure_indicators';
        } else if (line.match(/^    intermediate_checks:/)) {
          currentCheckpoint = 'intermediate_checks';
        } else if (currentCheckpoint === 'action_sequence' && line.match(/^      - /)) {
          const action = line.replace(/^      - /, '').trim().replace(/['"]/g, '');
          currentStep.actionSequence?.push(action);
        } else if (currentCheckpoint === 'success_criteria' && line.match(/^      - /)) {
          const criterion = line.replace(/^      - /, '').trim().replace(/['"]/g, '');
          currentStep.successCriteria?.push({ id: generateId(), text: criterion });
        } else if (currentCheckpoint === 'failure_indicators' && line.match(/^      - /)) {
          const indicator = line.replace(/^      - /, '').trim().replace(/['"]/g, '');
          currentStep.failureIndicators?.push({ id: generateId(), text: indicator });
        } else if (currentCheckpoint === 'intermediate_checks' && line.match(/^      "[^"]+":$/)) {
          currentCheckpoint = 'intermediate_checks_item';
          const checkpoint = line.replace(/^      /, '').replace(/":$/, '').replace(/"/g, '');
          currentStep.intermediateChecks = currentStep.intermediateChecks || [];
          currentStep.intermediateChecks.push({ checkpoint, checks: [] });
          currentCheckIndex = currentStep.intermediateChecks.length - 1;
        } else if (currentCheckIndex >= 0 && line.match(/^        - /)) {
          const check = line.replace(/^        - /, '').trim().replace(/['"]/g, '');
          currentStep.intermediateChecks?.[currentCheckIndex]?.checks.push({ id: generateId(), text: check });
        }
      }

      // Parse scenario_rules
      if (currentSection === 'scenario_rules') {
        if (line.match(/^    time_constraints:/)) {
          currentCheckpoint = 'time_constraints';
        } else if (line.match(/^    cabinet_types:/)) {
          currentCheckpoint = 'cabinet_types';
        } else if (line.match(/^    required_fields:/)) {
          currentCheckpoint = 'required_fields';
        } else if (line.match(/^    payment_validations:/)) {
          currentCheckpoint = 'payment_validations';
        } else if (line.match(/^      - /)) {
          const item = line.replace(/^      - /, '').trim().replace(/['"]/g, '');
          if (currentCheckpoint === 'time_constraints') {
            parsedScenarioRules.timeConstraints = [...(parsedScenarioRules.timeConstraints || []), item];
          } else if (currentCheckpoint === 'required_fields') {
            parsedScenarioRules.requiredFields = [...(parsedScenarioRules.requiredFields || []), item];
          } else if (currentCheckpoint === 'payment_validations') {
            parsedScenarioRules.paymentValidations = [...(parsedScenarioRules.paymentValidations || []), item];
          }
        } else if (line.match(/^      - name:/)) {
          // Cabinet type start
          const cabinetName = line.split(':')[1]?.trim().replace(/['"]/g, '') || '';
          parsedScenarioRules.cabinetTypes = parsedScenarioRules.cabinetTypes || [];
          parsedScenarioRules.cabinetTypes.push({ id: generateId(), name: cabinetName, priceMin: 0, priceMax: 0 });
        } else if (line.match(/^        price_range:/)) {
          // Price range for cabinet
          const priceRange = line.split(':')[1]?.trim().replace(/['"]/g, '') || '0-0';
          const [min, max] = priceRange.split('-').map(n => parseInt(n.trim()) || 0);
          if (parsedScenarioRules.cabinetTypes?.length) {
            const lastCabinet = parsedScenarioRules.cabinetTypes[parsedScenarioRules.cabinetTypes.length - 1];
            lastCabinet.priceMin = min;
            lastCabinet.priceMax = max;
          }
        }
      }

      // Parse error_recovery
      if (currentSection === 'error_recovery') {
        if (line.match(/^    network_error:/)) {
          currentErrorSection = 'networkError';
          currentCheckpoint = null;
        } else if (line.match(/^    page_load_failure:/)) {
          currentErrorSection = 'pageLoadFailure';
          currentCheckpoint = null;
        } else if (line.match(/^    out_of_stock:/)) {
          currentErrorSection = 'outOfStock';
          currentCheckpoint = null;
        } else if (currentErrorSection) {
          if (line.match(/^      indicators:/)) {
            currentCheckpoint = 'indicators';
            currentIndicatorList = [];
          } else if (line.match(/^      recovery_actions:/)) {
            currentCheckpoint = 'recovery_actions';
            currentActionList = [];
          } else if (line.match(/^        - /)) {
            const item = line.replace(/^        - /, '').trim().replace(/['"]/g, '');
            if (currentCheckpoint === 'indicators') {
              currentIndicatorList.push(item);
            } else if (currentCheckpoint === 'recovery_actions') {
              currentActionList.push(item);
            }
          }
          // Apply collected items when section changes or ends
          if ((line.match(/^      /) === null || line.match(/^    \w/)) && currentErrorSection) {
            if (currentIndicatorList.length) {
              parsedErrorRecovery[currentErrorSection].indicators = currentIndicatorList;
            }
            if (currentActionList.length) {
              parsedErrorRecovery[currentErrorSection].recoveryActions = currentActionList;
            }
          }
        }
      }

      // Parse assertion_strategy
      if (currentSection === 'assertion_strategy') {
        if (line.match(/^    default:/)) {
          currentCheckpoint = 'default_strategy';
        } else if (line.match(/^    critical:/)) {
          currentCheckpoint = 'critical_strategy';
        } else if (line.match(/^    lenient:/)) {
          currentCheckpoint = 'lenient_strategy';
        } else if (line.match(/^      confidence_threshold:/)) {
          const val = parseFloat(line.split(':')[1]?.trim()) || 0.7;
          if (currentCheckpoint === 'default_strategy') parsedStrategy.default.confidenceThreshold = val;
          else if (currentCheckpoint === 'critical_strategy') parsedStrategy.critical.confidenceThreshold = val;
          else if (currentCheckpoint === 'lenient_strategy') parsedStrategy.lenient.confidenceThreshold = val;
        } else if (line.match(/^      timeout:/)) {
          const val = parseInt(line.split(':')[1]?.trim()) || 3;
          if (currentCheckpoint === 'default_strategy') parsedStrategy.default.timeout = val;
          else if (currentCheckpoint === 'critical_strategy') parsedStrategy.critical.timeout = val;
          else if (currentCheckpoint === 'lenient_strategy') parsedStrategy.lenient.timeout = val;
        } else if (line.match(/^      retry_count:/)) {
          const val = parseInt(line.split(':')[1]?.trim()) || 0;
          if (currentCheckpoint === 'default_strategy') parsedStrategy.default.retryCount = val;
          else if (currentCheckpoint === 'critical_strategy') parsedStrategy.critical.retryCount = val;
          else if (currentCheckpoint === 'lenient_strategy') parsedStrategy.lenient.retryCount = val;
        }
      }
    }

    // Finalize last items
    if (currentActionRule?.actionType) {
      parsedActionRules.push(currentActionRule as ActionRule);
    }
    if (currentStep?.stepName) {
      parsedStepRules.push(currentStep as StepRule);
    }
    if (currentErrorSection && (currentIndicatorList.length || currentActionList.length)) {
      if (currentIndicatorList.length) {
        parsedErrorRecovery[currentErrorSection].indicators = currentIndicatorList;
      }
      if (currentActionList.length) {
        parsedErrorRecovery[currentErrorSection].recoveryActions = currentActionList;
      }
    }

    // Update state with parsed data
    if (parsedGlobalRules.appName) setGlobalRules(prev => ({ ...prev, ...parsedGlobalRules }));
    setActionRules(parsedActionRules);
    setStepRules(parsedStepRules);
    if (parsedScenarioRules.timeConstraints?.length || parsedScenarioRules.cabinetTypes?.length) {
      setScenarioRules(prev => ({ ...prev, ...parsedScenarioRules } as ScenarioRules));
    }
    setErrorRecovery(parsedErrorRecovery);
    setAssertionStrategy(parsedStrategy);

  }, [assertionStrategy]);

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.name.endsWith('.yaml') && !file.name.endsWith('.yml')) {
        alert('请上传 .yaml 或 .yml 文件');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        try {
          parseYamlToRules(content);
        } catch (err) {
          console.error('YAML 解析失败:', err);
          alert('YAML 解析失败，请检查文件格式');
        }
      };
      reader.readAsText(file);
      event.target.value = '';
    },
    [parseYamlToRules]
  );

  // Global Rules Handlers
  const addFailureIndicator = () => {
    setGlobalRules((prev) => ({
      ...prev,
      commonFailureIndicators: [...prev.commonFailureIndicators, { id: generateId(), text: '' }],
    }));
  };

  const removeFailureIndicator = (id: string) => {
    setGlobalRules((prev) => ({
      ...prev,
      commonFailureIndicators: prev.commonFailureIndicators.filter((item) => item.id !== id),
    }));
  };

  const updateFailureIndicator = (id: string, text: string) => {
    setGlobalRules((prev) => ({
      ...prev,
      commonFailureIndicators: prev.commonFailureIndicators.map((item) =>
        item.id === id ? { ...item, text } : item
      ),
    }));
  };

  const addSuccessIndicator = () => {
    setGlobalRules((prev) => ({
      ...prev,
      commonSuccessIndicators: [...prev.commonSuccessIndicators, { id: generateId(), text: '' }],
    }));
  };

  const removeSuccessIndicator = (id: string) => {
    setGlobalRules((prev) => ({
      ...prev,
      commonSuccessIndicators: prev.commonSuccessIndicators.filter((item) => item.id !== id),
    }));
  };

  const updateSuccessIndicator = (id: string, text: string) => {
    setGlobalRules((prev) => ({
      ...prev,
      commonSuccessIndicators: prev.commonSuccessIndicators.map((item) =>
        item.id === id ? { ...item, text } : item
      ),
    }));
  };

  // Action Rules Handlers
  const addActionRule = () => {
    setActionRules((prev) => [
      ...prev,
      {
        id: generateId(),
        actionType: 'tap',
        description: '',
        correctConditions: [],
        incorrectConditions: [],
        expectedElements: [],
        forbiddenElements: [],
        confidenceThreshold: 0.7,
      },
    ]);
  };

  const removeActionRule = (id: string) => {
    setActionRules((prev) => prev.filter((rule) => rule.id !== id));
  };

  const updateActionRule = (id: string, updates: Partial<ActionRule>) => {
    setActionRules((prev) =>
      prev.map((rule) => (rule.id === id ? { ...rule, ...updates } : rule))
    );
  };

  const addCondition = (ruleId: string, field: 'correctConditions' | 'incorrectConditions') => {
    setActionRules((prev) =>
      prev.map((rule) =>
        rule.id === ruleId
          ? { ...rule, [field]: [...rule[field], { id: generateId(), text: '' }] }
          : rule
      )
    );
  };

  const removeCondition = (
    ruleId: string,
    conditionId: string,
    field: 'correctConditions' | 'incorrectConditions'
  ) => {
    setActionRules((prev) =>
      prev.map((rule) =>
        rule.id === ruleId
          ? { ...rule, [field]: rule[field].filter((c) => c.id !== conditionId) }
          : rule
      )
    );
  };

  const updateCondition = (
    ruleId: string,
    conditionId: string,
    field: 'correctConditions' | 'incorrectConditions',
    text: string
  ) => {
    setActionRules((prev) =>
      prev.map((rule) =>
        rule.id === ruleId
          ? {
              ...rule,
              [field]: rule[field].map((c) => (c.id === conditionId ? { ...c, text } : c)),
            }
          : rule
      )
    );
  };

  // Step Rules Handlers
  const addStepRule = () => {
    setStepRules((prev) => [
      ...prev,
      {
        id: generateId(),
        stepName: '',
        stepDescription: '',
        actionSequence: [''],
        successCriteria: [],
        failureIndicators: [],
        intermediateChecks: [],
      },
    ]);
  };

  const removeStepRule = (id: string) => {
    setStepRules((prev) => prev.filter((rule) => rule.id !== id));
  };

  const updateStepRule = (id: string, updates: Partial<StepRule>) => {
    setStepRules((prev) =>
      prev.map((rule) => (rule.id === id ? { ...rule, ...updates } : rule))
    );
  };

  const addActionSequence = (ruleId: string) => {
    setStepRules((prev) =>
      prev.map((rule) =>
        rule.id === ruleId
          ? { ...rule, actionSequence: [...rule.actionSequence, ''] }
          : rule
      )
    );
  };

  const removeActionSequence = (ruleId: string, index: number) => {
    setStepRules((prev) =>
      prev.map((rule) =>
        rule.id === ruleId
          ? { ...rule, actionSequence: rule.actionSequence.filter((_, i) => i !== index) }
          : rule
      )
    );
  };

  const updateActionSequence = (ruleId: string, index: number, value: string) => {
    setStepRules((prev) =>
      prev.map((rule) =>
        rule.id === ruleId
          ? {
              ...rule,
              actionSequence: rule.actionSequence.map((action, i) =>
                i === index ? value : action
              ),
            }
          : rule
      )
    );
  };

  const addIntermediateCheck = (ruleId: string) => {
    setStepRules((prev) =>
      prev.map((rule) =>
        rule.id === ruleId
          ? {
              ...rule,
              intermediateChecks: [
                ...rule.intermediateChecks,
                { checkpoint: '', checks: [{ id: generateId(), text: '' }] },
              ],
            }
          : rule
      )
    );
  };

  const removeIntermediateCheck = (ruleId: string, index: number) => {
    setStepRules((prev) =>
      prev.map((rule) =>
        rule.id === ruleId
          ? {
              ...rule,
              intermediateChecks: rule.intermediateChecks.filter((_, i) => i !== index),
            }
          : rule
      )
    );
  };

  const updateIntermediateCheck = (
    ruleId: string,
    checkIndex: number,
    field: 'checkpoint' | 'checks',
    value: string | { id: string; text: string }[]
  ) => {
    setStepRules((prev) =>
      prev.map((rule) =>
        rule.id === ruleId
          ? {
              ...rule,
              intermediateChecks: rule.intermediateChecks.map((check, i) =>
                i === checkIndex ? { ...check, [field]: value } : check
              ),
            }
          : rule
      )
    );
  };

  const addCheckItem = (ruleId: string, checkIndex: number) => {
    setStepRules((prev) =>
      prev.map((rule) =>
        rule.id === ruleId
          ? {
              ...rule,
              intermediateChecks: rule.intermediateChecks.map((check, i) =>
                i === checkIndex
                  ? { ...check, checks: [...check.checks, { id: generateId(), text: '' }] }
                  : check
              ),
            }
          : rule
      )
    );
  };

  const removeCheckItem = (ruleId: string, checkIndex: number, itemId: string) => {
    setStepRules((prev) =>
      prev.map((rule) =>
        rule.id === ruleId
          ? {
              ...rule,
              intermediateChecks: rule.intermediateChecks.map((check, i) =>
                i === checkIndex
                  ? { ...check, checks: check.checks.filter((c) => c.id !== itemId) }
                  : check
              ),
            }
          : rule
      )
    );
  };

  const updateCheckItem = (
    ruleId: string,
    checkIndex: number,
    itemId: string,
    text: string
  ) => {
    setStepRules((prev) =>
      prev.map((rule) =>
        rule.id === ruleId
          ? {
              ...rule,
              intermediateChecks: rule.intermediateChecks.map((check, i) =>
                i === checkIndex
                  ? {
                      ...check,
                      checks: check.checks.map((c) =>
                        c.id === itemId ? { ...c, text } : c
                      ),
                    }
                  : check
              ),
            }
          : rule
      )
    );
  };

  // Scenario Rules Handlers
  const addTimeConstraint = () => {
    setScenarioRules((prev) => ({
      ...prev,
      timeConstraints: [...prev.timeConstraints, ''],
    }));
  };

  const removeTimeConstraint = (index: number) => {
    setScenarioRules((prev) => ({
      ...prev,
      timeConstraints: prev.timeConstraints.filter((_, i) => i !== index),
    }));
  };

  const updateTimeConstraint = (index: number, value: string) => {
    setScenarioRules((prev) => ({
      ...prev,
      timeConstraints: prev.timeConstraints.map((item, i) => (i === index ? value : item)),
    }));
  };

  const addCabinetType = () => {
    setScenarioRules((prev) => ({
      ...prev,
      cabinetTypes: [...prev.cabinetTypes, { id: generateId(), name: '', priceMin: 0, priceMax: 0 }],
    }));
  };

  const removeCabinetType = (id: string) => {
    setScenarioRules((prev) => ({
      ...prev,
      cabinetTypes: prev.cabinetTypes.filter((c) => c.id !== id),
    }));
  };

  const updateCabinetType = (id: string, updates: Partial<CabinetType>) => {
    setScenarioRules((prev) => ({
      ...prev,
      cabinetTypes: prev.cabinetTypes.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }));
  };

  const addRequiredField = () => {
    setScenarioRules((prev) => ({
      ...prev,
      requiredFields: [...prev.requiredFields, ''],
    }));
  };

  const removeRequiredField = (index: number) => {
    setScenarioRules((prev) => ({
      ...prev,
      requiredFields: prev.requiredFields.filter((_, i) => i !== index),
    }));
  };

  const updateRequiredField = (index: number, value: string) => {
    setScenarioRules((prev) => ({
      ...prev,
      requiredFields: prev.requiredFields.map((item, i) => (i === index ? value : item)),
    }));
  };

  const addPaymentValidation = () => {
    setScenarioRules((prev) => ({
      ...prev,
      paymentValidations: [...prev.paymentValidations, ''],
    }));
  };

  const removePaymentValidation = (index: number) => {
    setScenarioRules((prev) => ({
      ...prev,
      paymentValidations: prev.paymentValidations.filter((_, i) => i !== index),
    }));
  };

  const updatePaymentValidation = (index: number, value: string) => {
    setScenarioRules((prev) => ({
      ...prev,
      paymentValidations: prev.paymentValidations.map((item, i) => (i === index ? value : item)),
    }));
  };

  // Error Recovery Handlers
  const addErrorRecoveryIndicator = (section: keyof ErrorRecovery) => {
    setErrorRecovery((prev) => ({
      ...prev,
      [section]: { ...prev[section], indicators: [...prev[section].indicators, ''] },
    }));
  };

  const removeErrorRecoveryIndicator = (section: keyof ErrorRecovery, index: number) => {
    setErrorRecovery((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        indicators: prev[section].indicators.filter((_, i) => i !== index),
      },
    }));
  };

  const updateErrorRecoveryIndicator = (
    section: keyof ErrorRecovery,
    index: number,
    value: string
  ) => {
    setErrorRecovery((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        indicators: prev[section].indicators.map((item, i) => (i === index ? value : item)),
      },
    }));
  };

  const addErrorRecoveryAction = (section: keyof ErrorRecovery) => {
    setErrorRecovery((prev) => ({
      ...prev,
      [section]: { ...prev[section], recoveryActions: [...prev[section].recoveryActions, ''] },
    }));
  };

  const removeErrorRecoveryAction = (section: keyof ErrorRecovery, index: number) => {
    setErrorRecovery((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        recoveryActions: prev[section].recoveryActions.filter((_, i) => i !== index),
      },
    }));
  };

  const updateErrorRecoveryAction = (
    section: keyof ErrorRecovery,
    index: number,
    value: string
  ) => {
    setErrorRecovery((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        recoveryActions: prev[section].recoveryActions.map((item, i) => (i === index ? value : item)),
      },
    }));
  };

  const handleSave = () => {
    const yamlContent = generateYaml();
    console.log('Generated YAML:', yamlContent);
    // TODO: Send to backend or save to file
    alert('配置已生成，请查看控制台输出');
  };

  const handleReset = () => {
    setGlobalRules(defaultGlobalRules);
    setActionRules([]);
    setStepRules([]);
    setScenarioRules(defaultScenarioRules);
    setErrorRecovery(defaultErrorRecovery);
    setAssertionStrategy({
      default: { confidenceThreshold: 0.7, timeout: 3, retryCount: 0 },
      critical: { confidenceThreshold: 0.8, timeout: 5, retryCount: 1 },
      lenient: { confidenceThreshold: 0.6, timeout: 2, retryCount: 0 },
    });
  };

  const generateYaml = (): string => {
    let yaml = '# 断言规则配置文件\n\n';

    // Global Rules
    yaml += 'global_rules:\n';
    yaml += `  app_name: ${globalRules.appName}\n`;
    yaml += `  test_suite: ${globalRules.testSuite}\n`;
    yaml += `  default_confidence_threshold: ${globalRules.defaultConfidenceThreshold}\n`;
    yaml += `  timeout_seconds: ${globalRules.timeoutSeconds}\n`;
    yaml += '  common_failure_indicators:\n';
    globalRules.commonFailureIndicators.forEach((i) => {
      if (i.text.trim()) yaml += `    - ${i.text}\n`;
    });
    yaml += '  common_success_indicators:\n';
    globalRules.commonSuccessIndicators.forEach((i) => {
      if (i.text.trim()) yaml += `    - ${i.text}\n`;
    });
    yaml += '\n';

    // Action Rules
    yaml += 'action_rules:\n';
    actionRules.forEach((rule) => {
      yaml += `  - action_type: ${rule.actionType}\n`;
      if (rule.description) yaml += `    description: ${rule.description}\n`;
      yaml += `    confidence_threshold: ${rule.confidenceThreshold}\n`;
      if (rule.correctConditions.length) {
        yaml += '    correct_conditions:\n';
        rule.correctConditions.forEach((c) => {
          if (c.text.trim()) yaml += `      - ${c.text}\n`;
        });
      }
      if (rule.incorrectConditions.length) {
        yaml += '    incorrect_conditions:\n';
        rule.incorrectConditions.forEach((c) => {
          if (c.text.trim()) yaml += `      - ${c.text}\n`;
        });
      }
    });
    yaml += '\n';

    // Step Rules
    yaml += 'step_rules:\n';
    stepRules.forEach((rule) => {
      yaml += `  - step_name: ${rule.stepName}\n`;
      if (rule.stepDescription) yaml += `    step_description: ${rule.stepDescription}\n`;
      if (rule.actionSequence.filter((a) => a.trim()).length) {
        yaml += '    action_sequence:\n';
        rule.actionSequence.forEach((a) => {
          if (a.trim()) yaml += `      - ${a}\n`;
        });
      }
      if (rule.successCriteria.length) {
        yaml += '    success_criteria:\n';
        rule.successCriteria.forEach((c) => {
          if (c.text.trim()) yaml += `      - ${c.text}\n`;
        });
      }
      if (rule.failureIndicators.length) {
        yaml += '    failure_indicators:\n';
        rule.failureIndicators.forEach((c) => {
          if (c.text.trim()) yaml += `      - ${c.text}\n`;
        });
      }
      if (rule.intermediateChecks.filter((ic) => ic.checkpoint.trim()).length) {
        yaml += '    intermediate_checks:\n';
        rule.intermediateChecks.forEach((ic) => {
          if (ic.checkpoint.trim()) {
            yaml += `      "${ic.checkpoint}":\n`;
            ic.checks.forEach((check) => {
              if (check.text.trim()) yaml += `        - ${check.text}\n`;
            });
          }
        });
      }
    });
    yaml += '\n';

    // Scenario Rules
    yaml += 'scenario_rules:\n';
    if (scenarioRules.timeConstraints.length) {
      yaml += '  time_constraints:\n';
      scenarioRules.timeConstraints.forEach((tc) => {
        if (tc.trim()) yaml += `    - ${tc}\n`;
      });
    }
    if (scenarioRules.cabinetTypes.length) {
      yaml += '  cabinet_types:\n';
      scenarioRules.cabinetTypes.forEach((ct) => {
        if (ct.name.trim()) {
          yaml += `    - name: ${ct.name}\n`;
          yaml += `      price_range: ${ct.priceMin}-${ct.priceMax}\n`;
        }
      });
    }
    if (scenarioRules.requiredFields.length) {
      yaml += '  required_fields:\n';
      scenarioRules.requiredFields.forEach((rf) => {
        if (rf.trim()) yaml += `    - ${rf}\n`;
      });
    }
    if (scenarioRules.paymentValidations.length) {
      yaml += '  payment_validations:\n';
      scenarioRules.paymentValidations.forEach((pv) => {
        if (pv.trim()) yaml += `    - ${pv}\n`;
      });
    }
    yaml += '\n';

    // Error Recovery
    yaml += 'error_recovery:\n';
    (['networkError', 'pageLoadFailure', 'outOfStock'] as const).forEach((section) => {
      const sectionName = section === 'networkError' ? 'network_error'
        : section === 'pageLoadFailure' ? 'page_load_failure' : 'out_of_stock';
      yaml += `  ${sectionName}:\n`;
      yaml += '    indicators:\n';
      errorRecovery[section].indicators.forEach((ind) => {
        if (ind.trim()) yaml += `      - ${ind}\n`;
      });
      yaml += '    recovery_actions:\n';
      errorRecovery[section].recoveryActions.forEach((action) => {
        if (action.trim()) yaml += `      - ${action}\n`;
      });
    });
    yaml += '\n';

    // Assertion Strategy
    yaml += 'assertion_strategy:\n';
    (['default', 'critical', 'lenient'] as const).forEach((strategy) => {
      yaml += `  ${strategy}:\n`;
      yaml += `    confidence_threshold: ${assertionStrategy[strategy].confidenceThreshold}\n`;
      yaml += `    timeout: ${assertionStrategy[strategy].timeout}\n`;
      yaml += `    retry_count: ${assertionStrategy[strategy].retryCount}\n`;
    });

    return yaml;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">断言规则配置</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          配置 UI 自动化测试的断言规则和验证逻辑
        </p>
      </div>

      {/* YAML Import Area */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer',
          'hover:border-orange-500/50 hover:bg-orange-500/5'
        )}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".yaml,.yml"
          onChange={handleFileUpload}
          className="hidden"
        />
        <FileText className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
        <p className="text-sm text-[var(--text-secondary)]">
          点击上传 YAML 文件，自动解析为测试步骤
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          支持 assertion_rules.yaml 格式
        </p>
      </div>

      {/* Global Rules Section */}
      <SectionHeader
        title="全局规则"
        description="基础配置和通用指标"
        icon={<Save className="w-5 h-5" />}
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>应用名称</Label>
            <Input
              value={globalRules.appName}
              onChange={(e) =>
                setGlobalRules((prev) => ({ ...prev, appName: e.target.value }))
              }
              placeholder="例如：微信小程序"
            />
          </div>
          <div className="space-y-2">
            <Label>测试套件</Label>
            <Input
              value={globalRules.testSuite}
              onChange={(e) =>
                setGlobalRules((prev) => ({ ...prev, testSuite: e.target.value }))
              }
              placeholder="例如：无忧存预约下单"
            />
          </div>
          <div className="space-y-2">
            <Label>默认置信度阈值</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="1"
              value={globalRules.defaultConfidenceThreshold}
              onChange={(e) =>
                setGlobalRules((prev) => ({
                  ...prev,
                  defaultConfidenceThreshold: parseFloat(e.target.value) || 0.7,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>超时时间 (秒)</Label>
            <Input
              type="number"
              value={globalRules.timeoutSeconds}
              onChange={(e) =>
                setGlobalRules((prev) => ({
                  ...prev,
                  timeoutSeconds: parseInt(e.target.value) || 5,
                }))
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <InputWithAdd
            label="通用失败指标"
            items={globalRules.commonFailureIndicators}
            onAdd={addFailureIndicator}
            onRemove={removeFailureIndicator}
            onUpdate={updateFailureIndicator}
            placeholder="例如：网络错误"
          />
          <InputWithAdd
            label="通用成功指标"
            items={globalRules.commonSuccessIndicators}
            onAdd={addSuccessIndicator}
            onRemove={removeSuccessIndicator}
            onUpdate={updateSuccessIndicator}
            placeholder="例如：操作成功"
          />
        </div>
      </SectionHeader>

      {/* Action Rules Section */}
      <SectionHeader
        title="动作规则"
        description="针对特定动作类型的断言规则"
        icon={<Plus className="w-5 h-5" />}
        defaultExpanded={false}
      >
        <Button variant="outline" onClick={addActionRule} className="w-full mb-4">
          <Plus className="w-4 h-4 mr-2" />
          添加动作规则
        </Button>

        <div className="space-y-4">
          {actionRules.map((rule, ruleIndex) => (
            <div
              key={rule.id}
              className="border border-[var(--border)] rounded-lg p-4 bg-[var(--bg-secondary)]"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-orange-500">
                  规则 #{ruleIndex + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeActionRule(rule.id)}
                  className="h-8 w-8 text-red-400 hover:text-red-300"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label>动作类型</Label>
                  <Select
                    value={rule.actionType}
                    onChange={(e) =>
                      updateActionRule(rule.id, { actionType: e.target.value })
                    }
                    options={ACTION_TYPE_OPTIONS}
                  />
                </div>
                <div className="space-y-2">
                  <Label>置信度阈值</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={rule.confidenceThreshold}
                    onChange={(e) =>
                      updateActionRule(rule.id, {
                        confidenceThreshold: parseFloat(e.target.value) || 0.7,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <Label>描述</Label>
                <Input
                  value={rule.description}
                  onChange={(e) =>
                    updateActionRule(rule.id, { description: e.target.value })
                  }
                  placeholder="例如：点击'我的'标签"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-green-400">正确条件</Label>
                  {rule.correctConditions.map((condition) => (
                    <div
                      key={condition.id}
                      className="flex items-center gap-2 p-2 rounded-md bg-[var(--bg-input)] border border-[var(--border)]"
                    >
                      <Input
                        value={condition.text}
                        onChange={(e) =>
                          updateCondition(
                            rule.id,
                            condition.id,
                            'correctConditions',
                            e.target.value
                          )
                        }
                        placeholder="描述正确条件"
                        className="flex-1 h-8 text-sm"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          removeCondition(rule.id, condition.id, 'correctConditions')
                        }
                        className="h-8 w-8 text-red-400 hover:text-red-300"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addCondition(rule.id, 'correctConditions')}
                    className="w-full h-8"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    添加
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label className="text-red-400">错误条件</Label>
                  {rule.incorrectConditions.map((condition) => (
                    <div
                      key={condition.id}
                      className="flex items-center gap-2 p-2 rounded-md bg-[var(--bg-input)] border border-[var(--border)]"
                    >
                      <Input
                        value={condition.text}
                        onChange={(e) =>
                          updateCondition(
                            rule.id,
                            condition.id,
                            'incorrectConditions',
                            e.target.value
                          )
                        }
                        placeholder="描述错误条件"
                        className="flex-1 h-8 text-sm"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          removeCondition(rule.id, condition.id, 'incorrectConditions')
                        }
                        className="h-8 w-8 text-red-400 hover:text-red-300"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addCondition(rule.id, 'incorrectConditions')}
                    className="w-full h-8"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    添加
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionHeader>

      {/* Step Rules Section */}
      <SectionHeader
        title="步骤规则"
        description="完整测试步骤的断言规则"
        icon={<Save className="w-5 h-5" />}
        defaultExpanded={false}
      >
        <Button variant="outline" onClick={addStepRule} className="w-full mb-4">
          <Plus className="w-4 h-4 mr-2" />
          添加步骤规则
        </Button>

        <div className="space-y-4">
          {stepRules.map((rule, ruleIndex) => (
            <div
              key={rule.id}
              className="border border-[var(--border)] rounded-lg p-4 bg-[var(--bg-secondary)]"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-orange-500">
                  步骤 #{ruleIndex + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeStepRule(rule.id)}
                  className="h-8 w-8 text-red-400 hover:text-red-300"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label>步骤名称</Label>
                  <Input
                    value={rule.stepName}
                    onChange={(e) =>
                      updateStepRule(rule.id, { stepName: e.target.value })
                    }
                    placeholder="例如：从收藏进入门店"
                  />
                </div>
                <div className="space-y-2">
                  <Label>步骤描述</Label>
                  <Input
                    value={rule.stepDescription}
                    onChange={(e) =>
                      updateStepRule(rule.id, { stepDescription: e.target.value })
                    }
                    placeholder="详细描述步骤目的"
                  />
                </div>
              </div>

              {/* Action Sequence */}
              <div className="space-y-2 mb-4">
                <Label>动作序列</Label>
                {rule.actionSequence.map((action, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 rounded-md bg-[var(--bg-input)] border border-[var(--border)]"
                  >
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-500/20 text-orange-500 text-xs font-medium">
                      {index + 1}
                    </span>
                    <Input
                      value={action}
                      onChange={(e) =>
                        updateActionSequence(rule.id, index, e.target.value)
                      }
                      placeholder="描述动作"
                      className="flex-1 h-8 text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeActionSequence(rule.id, index)}
                      disabled={rule.actionSequence.length === 1}
                      className="h-8 w-8 text-red-400 hover:text-red-300"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addActionSequence(rule.id)}
                  className="w-full h-8"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  添加动作
                </Button>
              </div>

              {/* Intermediate Checks */}
              <div className="space-y-3 pt-4 border-t border-[var(--border)]">
                <Label>中间检查点</Label>
                {rule.intermediateChecks.map((check, checkIndex) => (
                  <div
                    key={checkIndex}
                    className="p-3 rounded-md bg-[var(--bg-input)] border border-[var(--border)]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Input
                        value={check.checkpoint}
                        onChange={(e) =>
                          updateIntermediateCheck(
                            rule.id,
                            checkIndex,
                            'checkpoint',
                            e.target.value
                          )
                        }
                        placeholder="检查点名称，如：点击'我的'后"
                        className="font-medium"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeIntermediateCheck(rule.id, checkIndex)}
                        className="ml-2 h-8 w-8 text-red-400 hover:text-red-300"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="space-y-1.5 pl-2">
                      {check.checks.map((item) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <span className="text-orange-500 text-xs">•</span>
                          <Input
                            value={item.text}
                            onChange={(e) =>
                              updateCheckItem(
                                rule.id,
                                checkIndex,
                                item.id,
                                e.target.value
                              )
                            }
                            placeholder="检查条件"
                            className="h-8 text-sm bg-[var(--bg-secondary)]"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              removeCheckItem(rule.id, checkIndex, item.id)
                            }
                            className="h-8 w-8 text-red-400 hover:text-red-300"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addCheckItem(rule.id, checkIndex)}
                        className="w-full h-7 text-xs"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        添加检查项
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addIntermediateCheck(rule.id)}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  添加检查点
                </Button>
              </div>
            </div>
          ))}
        </div>
      </SectionHeader>

      {/* Scenario Rules Section */}
      <SectionHeader
        title="场景规则"
        description="特定业务场景的断言配置"
        icon={<FileText className="w-5 h-5" />}
        defaultExpanded={false}
      >
        <div className="space-y-4">
          {/* Time Constraints */}
          <div className="space-y-2">
            <Label>时间约束</Label>
            {scenarioRules.timeConstraints.map((tc, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 rounded-md bg-[var(--bg-input)] border border-[var(--border)]"
              >
                <Input
                  value={tc}
                  onChange={(e) => updateTimeConstraint(index, e.target.value)}
                  placeholder="例如：9:00-18:00"
                  className="flex-1 h-8 text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeTimeConstraint(index)}
                  className="h-8 w-8 text-red-400 hover:text-red-300"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addTimeConstraint}
              className="w-full h-8"
            >
              <Plus className="w-4 h-4 mr-1" />
              添加时间约束
            </Button>
          </div>

          {/* Cabinet Types */}
          <div className="space-y-2">
            <Label>柜体类型</Label>
            {scenarioRules.cabinetTypes.map((cabinet) => (
              <div
                key={cabinet.id}
                className="p-3 rounded-md bg-[var(--bg-input)] border border-[var(--border)] space-y-2"
              >
                <div className="flex items-center gap-2">
                  <Input
                    value={cabinet.name}
                    onChange={(e) =>
                      updateCabinetType(cabinet.id, { name: e.target.value })
                    }
                    placeholder="柜体名称"
                    className="flex-1 h-8 text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCabinetType(cabinet.id)}
                    className="h-8 w-8 text-red-400 hover:text-red-300"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    value={cabinet.priceMin}
                    onChange={(e) =>
                      updateCabinetType(cabinet.id, {
                        priceMin: parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="最低价格"
                    className="h-8 text-sm"
                  />
                  <Input
                    type="number"
                    value={cabinet.priceMax}
                    onChange={(e) =>
                      updateCabinetType(cabinet.id, {
                        priceMax: parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="最高价格"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCabinetType}
              className="w-full h-8"
            >
              <Plus className="w-4 h-4 mr-1" />
              添加柜体类型
            </Button>
          </div>

          {/* Required Fields */}
          <div className="space-y-2">
            <Label>必填字段</Label>
            {scenarioRules.requiredFields.map((field, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 rounded-md bg-[var(--bg-input)] border border-[var(--border)]"
              >
                <Input
                  value={field}
                  onChange={(e) => updateRequiredField(index, e.target.value)}
                  placeholder="例如：手机号"
                  className="flex-1 h-8 text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRequiredField(index)}
                  className="h-8 w-8 text-red-400 hover:text-red-300"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addRequiredField}
              className="w-full h-8"
            >
              <Plus className="w-4 h-4 mr-1" />
              添加必填字段
            </Button>
          </div>

          {/* Payment Validations */}
          <div className="space-y-2">
            <Label>支付方式验证</Label>
            {scenarioRules.paymentValidations.map((pv, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 rounded-md bg-[var(--bg-input)] border border-[var(--border)]"
              >
                <Input
                  value={pv}
                  onChange={(e) => updatePaymentValidation(index, e.target.value)}
                  placeholder="例如：微信支付"
                  className="flex-1 h-8 text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removePaymentValidation(index)}
                  className="h-8 w-8 text-red-400 hover:text-red-300"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addPaymentValidation}
              className="w-full h-8"
            >
              <Plus className="w-4 h-4 mr-1" />
              添加支付方式
            </Button>
          </div>
        </div>
      </SectionHeader>

      {/* Error Recovery Section */}
      <SectionHeader
        title="错误恢复"
        description="异常情况的检测和恢复策略"
        icon={<FileText className="w-5 h-5" />}
        defaultExpanded={false}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Network Error */}
          <div className="border border-[var(--border)] rounded-lg p-4 bg-[var(--bg-secondary)]">
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
              网络错误
            </h4>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">检测指标</Label>
                {errorRecovery.networkError.indicators.map((ind, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={ind}
                      onChange={(e) =>
                        updateErrorRecoveryIndicator('networkError', index, e.target.value)
                      }
                      placeholder="例如：网络连接失败"
                      className="h-8 text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeErrorRecoveryIndicator('networkError', index)}
                      className="h-8 w-8 text-red-400 hover:text-red-300"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addErrorRecoveryIndicator('networkError')}
                  className="w-full h-7 text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  添加
                </Button>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">恢复操作</Label>
                {errorRecovery.networkError.recoveryActions.map((action, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={action}
                      onChange={(e) =>
                        updateErrorRecoveryAction('networkError', index, e.target.value)
                      }
                      placeholder="例如：等待后重试"
                      className="h-8 text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeErrorRecoveryAction('networkError', index)}
                      className="h-8 w-8 text-red-400 hover:text-red-300"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addErrorRecoveryAction('networkError')}
                  className="w-full h-7 text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  添加
                </Button>
              </div>
            </div>
          </div>

          {/* Page Load Failure */}
          <div className="border border-[var(--border)] rounded-lg p-4 bg-[var(--bg-secondary)]">
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
              页面加载失败
            </h4>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">检测指标</Label>
                {errorRecovery.pageLoadFailure.indicators.map((ind, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={ind}
                      onChange={(e) =>
                        updateErrorRecoveryIndicator('pageLoadFailure', index, e.target.value)
                      }
                      placeholder="例如：白屏"
                      className="h-8 text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeErrorRecoveryIndicator('pageLoadFailure', index)}
                      className="h-8 w-8 text-red-400 hover:text-red-300"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addErrorRecoveryIndicator('pageLoadFailure')}
                  className="w-full h-7 text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  添加
                </Button>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">恢复操作</Label>
                {errorRecovery.pageLoadFailure.recoveryActions.map((action, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={action}
                      onChange={(e) =>
                        updateErrorRecoveryAction('pageLoadFailure', index, e.target.value)
                      }
                      placeholder="例如：重新进入"
                      className="h-8 text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeErrorRecoveryAction('pageLoadFailure', index)}
                      className="h-8 w-8 text-red-400 hover:text-red-300"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addErrorRecoveryAction('pageLoadFailure')}
                  className="w-full h-7 text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  添加
                </Button>
              </div>
            </div>
          </div>

          {/* Out of Stock */}
          <div className="border border-[var(--border)] rounded-lg p-4 bg-[var(--bg-secondary)]">
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
              库存不足
            </h4>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">检测指标</Label>
                {errorRecovery.outOfStock.indicators.map((ind, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={ind}
                      onChange={(e) =>
                        updateErrorRecoveryIndicator('outOfStock', index, e.target.value)
                      }
                      placeholder="例如：已售罄"
                      className="h-8 text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeErrorRecoveryIndicator('outOfStock', index)}
                      className="h-8 w-8 text-red-400 hover:text-red-300"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addErrorRecoveryIndicator('outOfStock')}
                  className="w-full h-7 text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  添加
                </Button>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">恢复操作</Label>
                {errorRecovery.outOfStock.recoveryActions.map((action, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={action}
                      onChange={(e) =>
                        updateErrorRecoveryAction('outOfStock', index, e.target.value)
                      }
                      placeholder="例如：选择其他商品"
                      className="h-8 text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeErrorRecoveryAction('outOfStock', index)}
                      className="h-8 w-8 text-red-400 hover:text-red-300"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addErrorRecoveryAction('outOfStock')}
                  className="w-full h-7 text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  添加
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SectionHeader>

      {/* Assertion Strategy Section */}
      <SectionHeader
        title="断言策略"
        description="不同严格程度的断言配置"
        icon={<Save className="w-5 h-5" />}
        defaultExpanded={false}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(assertionStrategy).map(([key, strategy]) => (
            <div
              key={key}
              className="border border-[var(--border)] rounded-lg p-4 bg-[var(--bg-secondary)]"
            >
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3 capitalize">
                {STRATEGY_OPTIONS.find((o) => o.value === key)?.label || key}
              </h4>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">置信度阈值</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={strategy.confidenceThreshold}
                    onChange={(e) =>
                      setAssertionStrategy((prev) => ({
                        ...prev,
                        [key]: {
                          ...prev[key as keyof typeof prev],
                          confidenceThreshold: parseFloat(e.target.value) || 0.7,
                        },
                      }))
                    }
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">超时时间 (秒)</Label>
                  <Input
                    type="number"
                    value={strategy.timeout}
                    onChange={(e) =>
                      setAssertionStrategy((prev) => ({
                        ...prev,
                        [key]: {
                          ...prev[key as keyof typeof prev],
                          timeout: parseInt(e.target.value) || 3,
                        },
                      }))
                    }
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">重试次数</Label>
                  <Input
                    type="number"
                    value={strategy.retryCount}
                    onChange={(e) =>
                      setAssertionStrategy((prev) => ({
                        ...prev,
                        [key]: {
                          ...prev[key as keyof typeof prev],
                          retryCount: parseInt(e.target.value) || 0,
                        },
                      }))
                    }
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionHeader>

      {/* Save Button */}
      <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
        <Button variant="outline" onClick={handleReset}>
          <Trash2 className="w-4 h-4 mr-2" />
          重置
        </Button>
        <Button variant="default" className="glow-orange" onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          保存配置
        </Button>
      </div>
    </div>
  );
};

'use client';

import { useRef, ElementType } from 'react';
import { CaretDown, PaperPlaneTilt, Crown } from '@phosphor-icons/react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { NotificationPreview } from './NotificationPreview';
import { VariableDropdown, Variable } from './VariableDropdown';

const TITLE_MAX_LENGTH = 50;
const MESSAGE_MAX_LENGTH = 178;

export interface NotificationTemplate {
  title: string;
  message: string;
  enabled?: boolean;
}

interface NotificationCardProps {
  type: 'stamp' | 'milestone' | 'reward';
  label: string;
  description: string;
  icon: ElementType;
  template: NotificationTemplate;
  variables: Variable[];
  isExpanded: boolean;
  onExpandChange: (expanded: boolean) => void;
  onTemplateChange: (field: keyof NotificationTemplate, value: string | boolean) => void;
  isProPlan: boolean;
  appName?: string;
  appIconUrl?: string;
}

export function NotificationCard({
  label,
  description,
  icon: Icon,
  template,
  variables,
  isExpanded,
  onExpandChange,
  onTemplateChange,
  isProPlan,
  appName,
  appIconUrl,
}: NotificationCardProps) {
  const messageRef = useRef<HTMLTextAreaElement>(null);

  const handleVariableInsert = (variable: string) => {
    if (!messageRef.current) return;

    const textarea = messageRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = template.message;

    const newValue = currentValue.substring(0, start) + variable + currentValue.substring(end);
    onTemplateChange('message', newValue);

    // Restore cursor position after the inserted variable
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  const titleLength = template.title.length;
  const messageLength = template.message.length;
  const isTitleOverLimit = titleLength > TITLE_MAX_LENGTH;
  const isMessageOverLimit = messageLength > MESSAGE_MAX_LENGTH;

  return (
    <Collapsible
      open={isExpanded}
      onOpenChange={onExpandChange}
      className="border border-border rounded-xl bg-card overflow-hidden transition-all"
    >
      {/* Header - always visible */}
      <CollapsibleTrigger asChild>
        <div
          className={cn(
            'flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors',
            'hover:bg-muted/50',
            isExpanded && 'border-b border-border bg-muted/30'
          )}
        >
          {/* Icon */}
          <div className="w-9 h-9 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center flex-shrink-0">
            <Icon className="h-4 w-4 text-[var(--accent)]" />
          </div>

          {/* Label and preview text */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm">{label}</p>
              {!isProPlan && (
                <Crown className="h-3.5 w-3.5 text-amber-500" weight="fill" />
              )}
            </div>
            {!isExpanded && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {template.message}
              </p>
            )}
          </div>

          {/* Toggle and expand icon */}
          <div className="flex items-center gap-3">
            <Switch
              checked={template.enabled !== false}
              onCheckedChange={(checked) => {
                if (isProPlan) {
                  onTemplateChange('enabled', checked);
                }
              }}
              disabled={!isProPlan}
              onClick={(e) => e.stopPropagation()}
            />
            <CaretDown
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform duration-200',
                isExpanded && 'rotate-180'
              )}
            />
          </div>
        </div>
      </CollapsibleTrigger>

      {/* Expanded content */}
      <CollapsibleContent className="data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
        <div className="p-4 pt-0">
          {/* Description */}
          <p className="text-xs text-muted-foreground mb-4 mt-3">
            {description}
          </p>

          {/* Two column layout: Editor + Preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Editor column */}
            <div className="space-y-4">
              {/* Title field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="title" className="text-xs text-muted-foreground">
                    Title
                  </Label>
                  <span
                    className={cn(
                      'text-[10px] tabular-nums',
                      isTitleOverLimit ? 'text-amber-500' : 'text-muted-foreground'
                    )}
                  >
                    {titleLength}/{TITLE_MAX_LENGTH}
                  </span>
                </div>
                <Input
                  id="title"
                  value={template.title}
                  onChange={(e) => onTemplateChange('title', e.target.value)}
                  disabled={!isProPlan}
                  className="text-sm"
                  placeholder="Notification title..."
                />
              </div>

              {/* Message field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="message" className="text-xs text-muted-foreground">
                    Message
                  </Label>
                  <span
                    className={cn(
                      'text-[10px] tabular-nums',
                      isMessageOverLimit ? 'text-amber-500' : 'text-muted-foreground'
                    )}
                  >
                    {messageLength}/{MESSAGE_MAX_LENGTH}
                  </span>
                </div>
                <Textarea
                  id="message"
                  ref={messageRef}
                  value={template.message}
                  onChange={(e) => onTemplateChange('message', e.target.value)}
                  disabled={!isProPlan}
                  className="text-sm min-h-[80px] resize-none"
                  placeholder="Notification message..."
                />
              </div>

              {/* Variable insertion and actions */}
              <div className="flex items-center justify-between pt-1">
                <VariableDropdown
                  variables={variables}
                  onInsert={handleVariableInsert}
                  disabled={!isProPlan}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  disabled
                  title="Send a test notification to your device"
                >
                  <PaperPlaneTilt className="w-3.5 h-3.5" />
                  Send Test
                </Button>
              </div>

              {/* Pro upsell message */}
              {!isProPlan && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-2">
                  <Crown className="h-3.5 w-3.5 text-amber-500" weight="fill" />
                  Upgrade to Pro to customize notification text
                </p>
              )}
            </div>

            {/* Preview column */}
            <div className="flex items-start justify-center md:pt-6">
              <NotificationPreview
                title={template.title}
                message={template.message}
                appName={appName}
                appIconUrl={appIconUrl}
              />
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default NotificationCard;

'use client';

import { BracketsCurly } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface Variable {
  key: string;
  label: string;
  example: string;
}

interface VariableDropdownProps {
  variables: Variable[];
  onInsert: (variable: string) => void;
  disabled?: boolean;
}

export function VariableDropdown({ variables, onInsert, disabled }: VariableDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1.5"
          disabled={disabled}
        >
          <BracketsCurly className="w-3.5 h-3.5" />
          Insert Variable
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {variables.map((variable) => (
          <DropdownMenuItem
            key={variable.key}
            onClick={() => onInsert(variable.key)}
            className="flex flex-col items-start gap-0.5 cursor-pointer"
          >
            <div className="flex items-center gap-2 w-full">
              <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                {variable.key}
              </code>
              <span className="text-muted-foreground text-xs ml-auto">
                e.g., {variable.example}
              </span>
            </div>
            <span className="text-xs text-muted-foreground pl-0.5">
              {variable.label}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default VariableDropdown;

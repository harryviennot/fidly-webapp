import * as React from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface FormFieldProps extends React.ComponentProps<typeof Input> {
  label: string;
  error?: string;
  hint?: string;
  labelClassName?: string;
}

function FormField({ label, error, hint, id, labelClassName, ...inputProps }: FormFieldProps) {
  const autoId = React.useId();
  const fieldId = id || autoId;

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={fieldId} className={labelClassName}>{label}</Label>
      <Input id={fieldId} aria-invalid={!!error} {...inputProps} />
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export { FormField }

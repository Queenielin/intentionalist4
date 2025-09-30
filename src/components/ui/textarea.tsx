import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    const [value, setValue] = React.useState(props.value || props.defaultValue || '');
    
    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setValue(newValue);
      
      // Count lines in the content
      const lines = newValue.split('\n').length;
      // Always show one extra line than content
      const displayLines = Math.max(2, lines + 1);
      
      // Set rows dynamically
      e.target.rows = displayLines;
      
      // Call original onChange if provided
      if (props.onChange) {
        props.onChange(e);
      }
    };

    return (
      <textarea
        rows={2}
        onInput={handleInput}
        onChange={handleInput}
        value={value}
        ref={ref}
        className={cn(
          "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...(props as any)}
      />
    );
  }
);

Textarea.displayName = "Textarea";

export { Textarea };

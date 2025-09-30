import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      e.target.style.height = "auto"; // reset height
      e.target.style.height = `${e.target.scrollHeight}px`; // set height to fit content
    };

    return (
      <textarea
        rows={2} // starts with 2 lines high
        onInput={handleInput}
        ref={ref}
        className={cn(
          "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";

export { Textarea };

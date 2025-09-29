// src/components/SlotCard.tsx
import { useState, useMemo } from "react";
import { Task, Slot, Category8 } from "@/types/task";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight, Copy, Trash2, Calendar, AlertTriangle, Users } from "lucide-react";
import { cn } from "@/lib/utils";

// Simple category → CSS class mapping (tailwind utility classes you already use)
// Feel free to adjust class names to match your design tokens.
function getCategoryClass(category: Category8): string {
  switch (category) {
    case "Analytical × Strategic": return "task-deep";
    case "Creative × Generative": return "task-deep";
    case "Learning × Absorptive": return "task-deep";
    case "Constructive × Building": return "task-deep";

    case "Social & Relational": return "task-light";
    case "Critical & Structuring": return "task-light";

    case "Clerical & Admin Routines": return "task-admin";
    case "Logistics & Maintenance": return "task-admin";

    default: return "task-light";
  }
}

interface SlotCardProps {
  slot: Slot;
  tasks: Task[]; // all tasks (we'll pick children by id)
  onUpdateSlot: (slotId: string, updates: Partial<Slot>) => void;
  onDeleteSlot: (slotId: string) => void;
  onDuplicateSlot: (slot: Slot) => void;
  onRemoveTaskFromSlot: (slotId: string, taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  isSelected: boolean;
  onClick: (e?: React.MouseEvent) => void;
}

export default function SlotCard({
  slot,
  tasks,
  onUpdateSlot,
  onDeleteSlot,
  onDuplicateSlot,
  onRemoveTaskFromSlot,
  onUpdateTask,
  isSelected,
  onClick,
}: SlotCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(slot.title);

  const slotTasks = useMemo(
    () => tasks.filter((t) => slot.taskIds.includes(t.id)),
    [tasks, slot.taskIds]
  );

  // total minutes in this slot (capped visually at 75)
  const totalDuration = useMemo(
    () => slotTasks.reduce((sum, t) => sum + t.duration, 0),
    [slotTasks]
  );

  const completedCount = slotTasks.filter((t) => t.completed).length;

  const handleSaveEdit = () => {
    if (editTitle.trim()) onUpdateSlot(slot.id, { title: editTitle.trim() });
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSaveEdit();
    else if (e.key === "Escape") {
      setIsEditing(false);
      setEditTitle(slot.title);
    }
  };

  const toggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateSlot(slot.id, { isExpanded: !slot.isExpanded });
  };

  const togglePriority = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateSlot(slot.id, { isPriority: !slot.isPriority });
  };

  return (
    <div
      className={cn(
        "group relative rounded-lg backdrop-blur-sm border transition-all cursor-grab active:cursor-grabbing",
        isSelected && "ring-2 ring-primary/50",
        slot.isPriority
          ? "bg-orange-500/30 border-orange-400/50 hover:bg-orange-500/40"
          : "bg-white/20 border-white/30 hover:bg-white/30"
      )}
      onClick={onClick}
      data-slot-id={slot.id}
    >
      {/* Header */}
      <div className="p-3 border-b border-white/20">
        <div className="flex items-center gap-2">
          {/* Priority indicator */}
          <div
            className="w-3 h-3 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
            onClick={togglePriority}
          >
            {slot.isPriority ? (
              <AlertTriangle className="w-3 h-3 text-orange-200 fill-orange-200" />
            ) : (
              <div className="w-2 h-2 rounded-full bg-white/60" />
            )}
          </div>

          {/* Expand/collapse */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleExpanded}
            className="h-4 w-4 p-0 text-white/70 hover:text-white"
          >
            {slot.isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </Button>

          {/* Icon */}
          <Users className="w-3 h-3 text-white/70" />

          {/* Title */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={handleKeyPress}
                onBlur={handleSaveEdit}
                className="text-xs h-6 bg-white/30 border-white/40 text-white"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <p
                className={cn(
                  "text-xs font-medium truncate hover:text-white/80 cursor-text",
                  slot.isPriority ? "text-orange-100" : "text-white"
                )}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                  setEditTitle(slot.title);
                }}
              >
                {slot.title}
              </p>
            )}
          </div>

          {/* Stats & duration */}
          <div className="flex items-center gap-1 text-xs text-white/70">
            <span>{completedCount}/{slot.taskIds.length}</span>
            <span>•</span>
            <span
              className={cn(
                "h-4 px-2 rounded border border-white/30",
                getCategoryClass(slot.category)
              )}
              title="Total minutes in this slot (max 75)"
            >
              {Math.min(totalDuration, 75)}m
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateSlot(slot.id, { scheduledDay: "tomorrow" });
              }}
              className="h-5 w-5 p-0 text-white/70 hover:text-white"
              title="Move to Tomorrow"
            >
              <Calendar className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicateSlot(slot);
              }}
              className="h-5 w-5 p-0 text-white/70 hover:text-white"
              title="Duplicate Slot"
            >
              <Copy className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteSlot(slot.id);
              }}
              className="h-5 w-5 p-0 text-white/70 hover:text-white"
              title="Delete Slot"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Body: child tasks */}
      {slot.isExpanded && (
        <div className="p-2 space-y-1" data-slot-expanded="true">
          {slotTasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                "flex items-center gap-2 p-2 rounded border border-white/20 hover:bg-white/10 transition-colors",
                getCategoryClass(task.category)
              )}
              onClick={(e) => e.stopPropagation()}
              data-task-id={task.id}
            >
              {/* Complete toggle */}
              <div
                className="w-3 h-3 rounded border border-white/40 flex items-center justify-center cursor-pointer hover:bg-white/20"
                onClick={() => onUpdateTask(task.id, { completed: !task.completed })}
              >
                {task.completed && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
              </div>

              {/* Title */}
              <span
                className={cn(
                  "flex-1 text-xs",
                  task.completed ? "text-white/50 line-through" : "text-white/90"
                )}
              >
                {task.title}
              </span>

              {/* Duration control (cycles 15 → 30 → 60) */}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  const cycle = (d: 15 | 30 | 60): 15 | 30 | 60 =>
                    d === 15 ? 30 : d === 30 ? 60 : 15;
                  onUpdateTask(task.id, { duration: cycle(task.duration) });
                }}
                className="h-4 px-1 text-xs bg-white/20 border border-white/30 text-white hover:bg-white/30 transition-colors opacity-0 group-hover:opacity-100"
                title="Change duration"
              >
                {task.duration}m
              </Button>

              {/* Remove from slot */}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveTaskFromSlot(slot.id, task.id);
                }}
                className="h-4 w-4 p-0 text-white/60 hover:text-white opacity-0 group-hover:opacity-100"
                title="Remove from slot"
              >
                ✕
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import React from 'react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors 
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Settings2, GripVertical, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

export interface ColumnOption {
  id: string;
  label: string;
  isVisible: boolean;
}

interface ColumnSettingsProps {
  columns: ColumnOption[];
  onColumnsChange: (columns: ColumnOption[]) => void;
}

const SortableItem = ({ id, label, isVisible, onToggle }: { id: string, label: string, isVisible: boolean, onToggle: (id: string) => void }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    position: 'relative' as any,
  };

  return (
    <div ref={setNodeRef} style={style} className={`flex items-center gap-2 p-2 bg-white rounded-lg border mb-1 shadow-sm transition-opacity ${isDragging ? 'opacity-50 border-primary' : 'border-transparent hover:border-border'}`}>
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-foreground touch-none p-1 -m-1">
        <GripVertical size={16} />
      </div>
      <button 
        onClick={() => onToggle(id)}
        className={`flex-1 text-left text-[13px] font-medium flex items-center justify-between group ${isVisible ? 'text-foreground' : 'text-muted-foreground'}`}
      >
        {label}
        {isVisible && <Check size={16} className="text-primary" />}
      </button>
    </div>
  );
};

export const ColumnSettings: React.FC<ColumnSettingsProps> = ({ columns, onColumnsChange }) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = columns.findIndex((col) => col.id === active.id);
      const newIndex = columns.findIndex((col) => col.id === over.id);
      onColumnsChange(arrayMove(columns, oldIndex, newIndex));
    }
  };

  const toggleColumn = (id: string) => {
    onColumnsChange(columns.map(col => col.id === id ? { ...col, isVisible: !col.isVisible } : col));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          title="Tùy chỉnh cột"
          className="flex items-center justify-center border border-border bg-white text-muted-foreground hover:text-foreground hover:bg-muted/50 h-[38px] w-[38px] md:w-auto md:px-3 rounded-xl transition-colors shrink-0 shadow-sm"
        >
          <Settings2 size={17} className="md:mr-2" />
          <span className="hidden md:inline text-[13px] font-bold">Cột</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 z-[100] border-transparent shadow-xl ring-1 ring-border/50" align="end">
        <div className="mb-3 border-b border-border pb-3">
          <h4 className="text-[14px] font-bold">Tùy chỉnh cột</h4>
          <p className="text-[12px] text-muted-foreground mt-0.5">Kéo thả để sắp xếp, chạm để ẩn/hiện</p>
        </div>
        
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={columns.map(c => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="max-h-[300px] overflow-y-auto custom-scrollbar -mx-1 px-1">
              {columns.map((col) => (
                <SortableItem key={col.id} id={col.id} label={col.label} isVisible={col.isVisible} onToggle={toggleColumn} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </PopoverContent>
    </Popover>
  );
};

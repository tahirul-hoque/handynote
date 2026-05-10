import { useState, useEffect, useRef } from 'react';
import { 
  MousePointer2, Pencil, Type, Square, Circle, Minus, 
  Eraser, Undo2, Redo2, Trash, Image as ImageIcon, Save
} from 'lucide-react';

export type DrawingMode = 'select' | 'draw' | 'type' | 'rectangle' | 'circle' | 'line' | 'eraser';

interface ToolbarProps {
  mode: DrawingMode;
  setMode: (mode: DrawingMode) => void;
  color: string;
  setColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (w: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onDeleteSelected: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isSaving: boolean;
  canUndo: boolean;
  canRedo: boolean;
}

export default function Toolbar({
  mode,
  setMode,
  color,
  setColor,
  strokeWidth,
  setStrokeWidth,
  onUndo,
  onRedo,
  onDeleteSelected,
  onImageUpload,
  isSaving,
  canUndo,
  canRedo
}: ToolbarProps) {
  const [showSlider, setShowSlider] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startHideTimer = () => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => {
      setShowSlider(false);
    }, 2000); // Hide after 2 seconds of inactivity
  };

  // Show slider when mode changes to a tool that supports stroke
  useEffect(() => {
    if (['draw', 'rectangle', 'circle', 'line', 'eraser'].includes(mode)) {
      setShowSlider(true);
      startHideTimer();
    } else {
      setShowSlider(false);
    }
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [mode]);

  const handleStrokeWidthChange = (w: number) => {
    setStrokeWidth(w);
    startHideTimer(); // Keep visible while adjusting
  };
  
  const ToolButton = ({ 
    icon: Icon, 
    value, 
    title,
    onClick
  }: { 
    icon: any, 
    value?: DrawingMode, 
    title: string,
    onClick?: () => void 
  }) => {
    const isActive = value && mode === value;
    return (
      <button
        onClick={onClick ? onClick : () => value && setMode(value)}
        title={title}
        className={`p-2 rounded-md flex items-center justify-center transition-colors flex-shrink-0 ${
          isActive 
            ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' 
            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
        }`}
      >
        <Icon size={20} />
      </button>
    );
  };

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 shadow-lg rounded-xl flex items-center gap-1 p-2 z-10 overflow-x-auto max-w-[95vw]">
      
      {/* Selection & Drawing Tools */}
      <ToolButton icon={MousePointer2} value="select" title="Select / Move (Esc)" />
      <ToolButton icon={Pencil} value="draw" title="Draw" />
      <ToolButton icon={Type} value="type" title="Text" />
      <ToolButton icon={Eraser} value="eraser" title="Eraser" />
      
      <div className="w-px h-6 bg-gray-300 dark:bg-zinc-700 mx-1 flex-shrink-0" />
      
      {/* Shapes */}
      <ToolButton icon={Square} value="rectangle" title="Rectangle" />
      <ToolButton icon={Circle} value="circle" title="Circle" />
      <ToolButton icon={Minus} value="line" title="Line" />
      
      <div className="w-px h-6 bg-gray-300 dark:bg-zinc-700 mx-1 flex-shrink-0" />

      {/* Color Picker */}
      <div className="relative flex-shrink-0" title="Color">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          onFocus={startHideTimer}
          className="w-8 h-8 p-0.5 border border-gray-300 dark:border-zinc-600 rounded-md cursor-pointer bg-transparent overflow-hidden"
          title="Stroke / Fill Color"
        />
      </div>

      {/* Thickness Slider — transient visibility */}
      {showSlider && (
        <div 
          className="flex items-center gap-2 flex-shrink-0 px-1 animate-in fade-in slide-in-from-top-1 duration-200" 
          title={`Stroke Thickness: ${strokeWidth}px`}
          onMouseEnter={() => { if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current); }}
          onMouseLeave={startHideTimer}
        >
          <div className="w-px h-6 bg-gray-300 dark:bg-zinc-700 mx-1 flex-shrink-0" />
          {/* Thin line icon */}
          <svg width="14" height="14" viewBox="0 0 14 14" className="text-gray-400 dark:text-zinc-500 flex-shrink-0">
            <line x1="2" y1="12" x2="12" y2="2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          </svg>
          <input
            type="range"
            min={1}
            max={32}
            step={1}
            value={strokeWidth}
            onChange={(e) => handleStrokeWidthChange(Number(e.target.value))}
            className="w-24 h-1.5 appearance-none rounded-full cursor-pointer bg-gray-200 dark:bg-zinc-700 accent-blue-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer"
            title={`Stroke Thickness: ${strokeWidth}px`}
          />
          {/* Thick line icon */}
          <svg width="14" height="14" viewBox="0 0 14 14" className="text-gray-400 dark:text-zinc-500 flex-shrink-0">
            <line x1="2" y1="12" x2="12" y2="2" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          </svg>
          <span className="text-xs font-mono text-gray-500 dark:text-zinc-400 w-6 text-center flex-shrink-0 bg-gray-100 dark:bg-zinc-800 rounded px-1 py-0.5">
            {strokeWidth}
          </span>
        </div>
      )}
      
      <div className="w-px h-6 bg-gray-300 dark:bg-zinc-700 mx-1 flex-shrink-0" />
      
      {/* Image Upload */}
      <label
        className="p-2 rounded-md flex items-center justify-center text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-zinc-800 cursor-pointer transition-colors flex-shrink-0"
        title="Upload Image"
      >
        <ImageIcon size={20} />
        <input type="file" accept="image/*" onChange={onImageUpload} className="hidden" />
      </label>
      
      {/* Delete */}
      <ToolButton icon={Trash} onClick={onDeleteSelected} title="Delete Selected (Del)" />
      
      <div className="w-px h-6 bg-gray-300 dark:bg-zinc-700 mx-1 flex-shrink-0" />
      
      {/* Undo / Redo */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
        className={`p-2 rounded-md flex items-center justify-center transition-colors flex-shrink-0 ${
          canUndo 
            ? 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-zinc-800' 
            : 'text-gray-300 dark:text-zinc-600 cursor-not-allowed'
        }`}
      >
        <Undo2 size={20} />
      </button>
      
      <button
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo (Ctrl+Y)"
        className={`p-2 rounded-md flex items-center justify-center transition-colors flex-shrink-0 ${
          canRedo 
            ? 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-zinc-800' 
            : 'text-gray-300 dark:text-zinc-600 cursor-not-allowed'
        }`}
      >
        <Redo2 size={20} />
      </button>

      {/* Save Status */}
      <div className="ml-2 px-2 flex items-center flex-shrink-0">
        {isSaving ? (
          <span className="text-xs text-gray-500 dark:text-zinc-400 flex items-center gap-1">
            <Save size={14} className="animate-pulse" /> Saving...
          </span>
        ) : (
          <span className="text-xs text-green-500 dark:text-green-400 flex items-center gap-1">
            <Save size={14} /> Saved
          </span>
        )}
      </div>
    </div>
  );
}


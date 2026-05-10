'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as fabric from 'fabric';
import Toolbar, { DrawingMode } from './Toolbar';
import { useTheme } from 'next-themes';
import { FabricHistory } from '@/lib/fabric-history';

interface CanvasEditorProps {
  noteId: string;
  initialTitle: string;
  initialCanvasJson: string;
}

export default function CanvasEditor({ noteId, initialTitle, initialCanvasJson }: CanvasEditorProps) {
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<fabric.Canvas | null>(null);
  const historyRef = useRef<FabricHistory | null>(null);
  const modeRef = useRef<DrawingMode>('select');
  const colorRef = useRef<string>('#3b82f6');

  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [title, setTitle] = useState(initialTitle);
  const [mode, setMode] = useState<DrawingMode>('select');
  const [color, setColor] = useState('#3b82f6');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [isSaving, setIsSaving] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const strokeWidthRef = useRef<number>(2);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep refs in sync with state so event handlers always have latest values
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { strokeWidthRef.current = strokeWidth; }, [strokeWidth]);

  const triggerAutoSave = useCallback((t: string) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      if (!canvasRef.current) return;
      setIsSaving(true);
      try {
        const json = JSON.stringify(canvasRef.current.toJSON());
        await fetch(`/api/notes/${noteId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: t, canvasJson: json }),
        });
      } catch (error) {
        console.error('Failed to autosave:', error);
      } finally {
        setIsSaving(false);
      }
    }, 2000);
  }, [noteId]);

  // --- Canvas Initialization ---
  useEffect(() => {
    if (!canvasElRef.current || !containerRef.current) return;

    const c = new fabric.Canvas(canvasElRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      isDrawingMode: false,
      selection: true,
      backgroundColor: 'transparent',
    });

    canvasRef.current = c;

    // History
    const hist = new FabricHistory(c, (cu, cr) => {
      setCanUndo(cu);
      setCanRedo(cr);
    });
    historyRef.current = hist;

    // Load saved data
    const initLoad = async () => {
      if (initialCanvasJson) {
        hist.isProcessing = true;
        try {
          await c.loadFromJSON(initialCanvasJson);
          c.renderAll();
        } catch(e) {
          console.error('Failed to load canvas:', e);
        }
        hist.isProcessing = false;
      }
      hist.saveState();
    };
    initLoad();

    // Setup pencil brush
    const brush = new fabric.PencilBrush(c);
    brush.color = colorRef.current;
    brush.width = 3;
    c.freeDrawingBrush = brush;

    // Resize handler
    const handleResize = () => {
      if (containerRef.current) {
        c.setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
        c.renderAll();
      }
    };
    window.addEventListener('resize', handleResize);

    // --- Panning & Zooming ---
    c.on('mouse:wheel', (opt) => {
      const evt = opt.e;
      if (evt.ctrlKey) {
        let zoom = c.getZoom();
        zoom *= 0.999 ** evt.deltaY;
        zoom = Math.min(Math.max(zoom, 0.05), 20);
        c.zoomToPoint(new fabric.Point(evt.offsetX, evt.offsetY), zoom);
      } else {
        const vpt = c.viewportTransform;
        if (vpt) {
          vpt[4] -= evt.deltaX;
          vpt[5] -= evt.deltaY;
          c.requestRenderAll();
        }
      }
      evt.preventDefault();
      evt.stopPropagation();
    });

    // Alt+drag panning
    let isPanning = false;
    let panStartX = 0;
    let panStartY = 0;

    c.on('mouse:down', (opt) => {
      const evt = opt.e as MouseEvent;
      if (evt.altKey || evt.button === 1) {
        isPanning = true;
        c.defaultCursor = 'grabbing';
        c.discardActiveObject();
        panStartX = evt.clientX;
        panStartY = evt.clientY;
        return;
      }

      // Shape/Text drawing
      const currentMode = modeRef.current;
      if (!['rectangle', 'circle', 'line', 'type'].includes(currentMode)) return;
      if ((evt as MouseEvent).altKey) return;

      const pointer = c.getScenePoint(opt.e);
      let obj: fabric.Object | null = null;

      if (currentMode === 'rectangle') {
        obj = new fabric.Rect({
          left: pointer.x,
          top: pointer.y,
          fill: 'transparent',
          stroke: colorRef.current,
          strokeWidth: strokeWidthRef.current,
          width: 150,
          height: 100,
          strokeUniform: true,
        });
      } else if (currentMode === 'circle') {
        obj = new fabric.Circle({
          left: pointer.x,
          top: pointer.y,
          fill: 'transparent',
          stroke: colorRef.current,
          strokeWidth: strokeWidthRef.current,
          radius: 60,
          strokeUniform: true,
        });
      } else if (currentMode === 'line') {
        obj = new fabric.Line(
          [pointer.x, pointer.y, pointer.x + 150, pointer.y],
          { stroke: colorRef.current, strokeWidth: strokeWidthRef.current, strokeUniform: true }
        );
      } else if (currentMode === 'type') {
        const itext = new fabric.IText('', {
          left: pointer.x,
          top: pointer.y,
          fill: colorRef.current,
          fontSize: 20,
          fontFamily: 'Inter, sans-serif',
        });
        c.add(itext);
        c.setActiveObject(itext);
        itext.enterEditing();
        setMode('select');
        modeRef.current = 'select';
        c.renderAll();
        return;
      }

      if (obj) {
        c.add(obj);
        c.setActiveObject(obj);
        hist.saveState();
        triggerAutoSave(title);
        setMode('select');
        modeRef.current = 'select';
        c.renderAll();
      }
    });

    c.on('mouse:move', (opt) => {
      if (!isPanning) return;
      const evt = opt.e as MouseEvent;
      const vpt = c.viewportTransform;
      if (vpt) {
        vpt[4] += evt.clientX - panStartX;
        vpt[5] += evt.clientY - panStartY;
        c.requestRenderAll();
        panStartX = evt.clientX;
        panStartY = evt.clientY;
      }
    });

    c.on('mouse:up', () => {
      if (isPanning) {
        isPanning = false;
        c.defaultCursor = 'default';
        if (c.viewportTransform) c.setViewportTransform(c.viewportTransform);
      }
    });

    // Auto save on canvas changes
    const onChanged = () => {
      if (!historyRef.current?.isProcessing) {
        triggerAutoSave(title);
      }
    };
    c.on('object:modified', () => { hist.saveState(); onChanged(); });
    c.on('path:created', () => { hist.saveState(); onChanged(); });

    setCanvas(c);

    return () => {
      window.removeEventListener('resize', handleResize);
      c.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Sync mode/color to canvas ---
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;

    // Apply color and thickness to selected objects live
    const activeObjects = c.getActiveObjects();
    if (activeObjects.length > 0) {
      let modified = false;
      activeObjects.forEach((obj) => {
        if (obj.type === 'i-text' || obj.type === 'text') {
          if (obj.get('fill') !== color) {
            obj.set('fill', color);
            modified = true;
          }
        } else if (['rect', 'circle', 'line', 'path'].includes(obj.type || '')) {
          if (obj.get('stroke') !== color || obj.get('strokeWidth') !== strokeWidth) {
            obj.set('stroke', color);
            obj.set('strokeWidth', strokeWidth);
            modified = true;
          }
        }
      });
      
      if (modified) {
        c.renderAll();
        // Save state after batch change if it's not during initial load
        if (!historyRef.current?.isProcessing) {
          historyRef.current?.saveState();
          triggerAutoSave(titleRef.current);
        }
      }
    }

    if (mode === 'draw') {
      c.isDrawingMode = true;
      if (c.freeDrawingBrush) {
        c.freeDrawingBrush.color = color;
        (c.freeDrawingBrush as fabric.PencilBrush).width = strokeWidth;
      }
    } else if (mode === 'eraser') {
      c.isDrawingMode = true;
      // Use a large white/black pencil to simulate erasing
      const bgColor = resolvedTheme === 'dark' ? '#09090b' : '#f9fafb';
      if (c.freeDrawingBrush) {
        c.freeDrawingBrush.color = bgColor;
        (c.freeDrawingBrush as fabric.PencilBrush).width = Math.max(strokeWidth * 3, 16);
      }
    } else {
      c.isDrawingMode = false;
    }

    if (mode === 'select') {
      c.selection = true;
      c.forEachObject((obj) => { obj.selectable = true; obj.evented = true; });
    } else {
      c.selection = false;
      c.discardActiveObject();
      c.forEachObject((obj) => { obj.selectable = false; obj.evented = false; });
    }

    // Update cursor
    if (['rectangle', 'circle', 'line', 'type'].includes(mode)) {
      c.defaultCursor = 'crosshair';
    } else if (mode === 'select') {
      c.defaultCursor = 'default';
    }

    c.renderAll();
  }, [mode, color, strokeWidth, resolvedTheme, triggerAutoSave]);

  // --- Update title autosave ---
  const titleRef = useRef(title);
  useEffect(() => {
    titleRef.current = title;
    if (canvasRef.current) triggerAutoSave(title);
  }, [title, triggerAutoSave]);

  // --- Keyboard shortcuts ---
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const c = canvasRef.current;
      const hist = historyRef.current;
      if (!c) return;

      // Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) hist?.redo(); else hist?.undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        hist?.redo();
        return;
      }

      // Delete / Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const active = c.getActiveObject();
        if (active && active.type === 'i-text' && (active as fabric.IText).isEditing) return;
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        e.preventDefault();
        const objs = c.getActiveObjects();
        c.discardActiveObject();
        objs.forEach((o) => c.remove(o));
        hist?.saveState();
        triggerAutoSave(titleRef.current);
      }

      // Escape → select mode
      if (e.key === 'Escape') setMode('select');
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [triggerAutoSave]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !canvasRef.current) return;
    const c = canvasRef.current;
    const reader = new FileReader();
    reader.onload = (f) => {
      const data = f.target?.result as string;
      fabric.FabricImage.fromURL(data).then((img) => {
        if (img.width && img.width > 600) img.scaleToWidth(600);
        c.add(img);
        c.centerObject(img);
        c.setActiveObject(img);
        c.renderAll();
        historyRef.current?.saveState();
        triggerAutoSave(titleRef.current);
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const deleteSelected = () => {
    const c = canvasRef.current;
    if (!c) return;
    const objs = c.getActiveObjects();
    if (!objs.length) return;
    c.discardActiveObject();
    objs.forEach((o) => c.remove(o));
    historyRef.current?.saveState();
    triggerAutoSave(titleRef.current);
    c.renderAll();
  };

  return (
    <div className="flex flex-col h-screen w-full relative overflow-hidden bg-gray-50 dark:bg-zinc-950 transition-colors duration-300">
      {/* Title */}
      <div className="absolute top-4 left-4 z-10 flex items-center bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-sm border border-gray-200 dark:border-zinc-800">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-transparent border-none outline-none font-bold text-gray-800 dark:text-gray-100 placeholder-gray-400 min-w-[200px] max-w-xs"
          placeholder="Note Title..."
        />
      </div>

      <Toolbar
        mode={mode}
        setMode={setMode}
        color={color}
        setColor={setColor}
        strokeWidth={strokeWidth}
        setStrokeWidth={setStrokeWidth}
        onUndo={() => historyRef.current?.undo()}
        onRedo={() => historyRef.current?.redo()}
        onDeleteSelected={deleteSelected}
        onImageUpload={handleImageUpload}
        isSaving={isSaving}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      <div ref={containerRef} className="flex-1 w-full h-full">
        <canvas ref={canvasElRef} />
      </div>

      <div className="absolute bottom-4 right-4 text-xs text-gray-400 dark:text-zinc-600 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-sm px-2 py-1 rounded pointer-events-none">
        Scroll: Pan | Ctrl+Scroll: Zoom | Alt+Drag: Pan | Esc: Select | Del: Delete
      </div>
    </div>
  );
}

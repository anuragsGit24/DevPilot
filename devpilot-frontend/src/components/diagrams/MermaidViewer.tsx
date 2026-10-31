import React, { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Copy,
  Check,
  Code2,
  Maximize2,
  Minimize2,
  AlertCircle,
  FileImage,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose',
  fontFamily: 'Inter, system-ui, sans-serif',
  themeVariables: {
    primaryColor: '#00AEEF',
    primaryTextColor: '#0A1628',
    primaryBorderColor: '#0093CC',
    lineColor: '#5480be',
    secondaryColor: '#e0f7ff',
    tertiaryColor: '#f8fafc',
    background: '#ffffff',
  },
});

interface MermaidViewerProps {
  chart: string;
  title?: string;
  className?: string;
}

export function MermaidViewer({ chart, title = 'Architecture Topology Diagram', className = '' }: MermaidViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const diagramRef = useRef<HTMLDivElement>(null);

  const [svgContent, setSvgContent] = useState<string>('');
  const [renderError, setRenderError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Zoom and Pan states
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Render diagram via Mermaid API
  useEffect(() => {
    let isMounted = true;
    const renderChart = async () => {
      if (!chart || !chart.trim()) {
        setSvgContent('');
        setRenderError('No Mermaid diagram definition provided.');
        return;
      }
      setRenderError(null);
      const uniqueId = `mermaid-${Math.random().toString(36).substring(2, 9)}`;

      try {
        const { svg } = await mermaid.render(uniqueId, chart.trim());
        if (isMounted) {
          setSvgContent(svg);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const errMsg = err instanceof Error ? err.message : String(err);
          setRenderError(errMsg);
        }
      }
    };

    void renderChart();
    return () => {
      isMounted = false;
    };
  }, [chart]);

  // Zoom handlers
  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.15, 3.0));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.15, 0.4));
  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (showRaw) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Copy diagram source
  const handleCopySource = async () => {
    try {
      await navigator.clipboard.writeText(chart);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  // Download SVG
  const handleDownloadSvg = useCallback(() => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [svgContent, title]);

  // Download PNG (rasterized at high dpi)
  const handleDownloadPng = useCallback(() => {
    if (!svgContent) return;
    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scaleFactor = 2; // high resolution export
      canvas.width = (img.width || 800) * scaleFactor;
      canvas.height = (img.height || 600) * scaleFactor;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scaleFactor, scaleFactor);
        ctx.drawImage(img, 0, 0);
        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, [svgContent, title]);

  return (
    <div
      ref={containerRef}
      className={`relative bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden transition-all duration-200 ${
        isFullscreen ? 'fixed inset-4 z-50 shadow-2xl flex flex-col' : ''
      } ${className}`}
    >
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-2">
          <Badge variant="primary" size="xs" dot>
            Mermaid.js Live
          </Badge>
          <span className="text-xs font-semibold text-slate-900 tracking-tight">{title}</span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Zoom controls */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-xs">
            <button
              onClick={handleZoomOut}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
              title="Zoom out"
              disabled={showRaw}
            >
              <ZoomOut size={14} />
            </button>
            <span className="text-2xs font-mono font-medium px-1.5 text-slate-600 min-w-[42px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
              title="Zoom in"
              disabled={showRaw}
            >
              <ZoomIn size={14} />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
              title="Reset Zoom & Position"
              disabled={showRaw}
            >
              <RotateCcw size={14} />
            </button>
          </div>

          {/* Toggle raw code */}
          <Button
            variant="ghost"
            size="xs"
            icon={<Code2 size={13} />}
            onClick={() => setShowRaw(!showRaw)}
            className="text-xs"
          >
            {showRaw ? 'View Diagram' : 'Mermaid Code'}
          </Button>

          {/* Copy button */}
          <Button
            variant="secondary"
            size="xs"
            icon={copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
            onClick={handleCopySource}
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>

          {/* Download dropdown / buttons */}
          <Button
            variant="secondary"
            size="xs"
            icon={<Download size={13} />}
            onClick={handleDownloadSvg}
            disabled={!svgContent || !!renderError}
            title="Download as vector SVG"
          >
            SVG
          </Button>

          <Button
            variant="secondary"
            size="xs"
            icon={<FileImage size={13} />}
            onClick={handleDownloadPng}
            disabled={!svgContent || !!renderError}
            title="Download as 2x PNG Image"
          >
            PNG
          </Button>

          {/* Fullscreen toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div
        className={`relative overflow-hidden bg-slate-50/50 ${
          isFullscreen ? 'flex-1' : 'h-[500px]'
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: showRaw ? 'default' : isDragging ? 'grabbing' : 'grab' }}
      >
        {renderError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-sm font-semibold text-red-900">Mermaid Render Error</p>
              <p className="text-xs text-red-700 max-w-lg mt-1 font-mono bg-red-50 p-2 rounded border border-red-200">
                {renderError}
              </p>
            </div>
            <Button variant="secondary" size="xs" onClick={() => setShowRaw(true)}>
              Inspect Raw Diagram Source
            </Button>
          </div>
        ) : showRaw ? (
          <div className="h-full overflow-auto p-4 bg-navy-900 text-slate-100 font-mono text-xs">
            <pre className="whitespace-pre-wrap">{chart}</pre>
          </div>
        ) : (
          <div
            ref={diagramRef}
            className="w-full h-full flex items-center justify-center select-none"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            }}
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        )}

        {/* Pan tip badge */}
        {!showRaw && !renderError && (
          <div className="absolute bottom-3 left-3 pointer-events-none">
            <span className="text-2xs bg-white/80 backdrop-blur-sm text-slate-500 px-2 py-1 rounded-md border border-slate-200 shadow-xs">
              Drag to pan • Use toolbar to zoom
            </span>
          </div>
        )}
      </div>
    </div>
  );
}


import { useEffect, useRef, useState } from "react";
import type { Point, Stroke } from "../services/api";

interface DrawingCanvasProps {
  strokes: Stroke[];
  onStroke?: (points: Point[]) => void;
  onClear?: () => void;
}

function drawStrokes(canvas: HTMLCanvasElement, strokes: Stroke[]) {
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const stroke of strokes) {
    if (stroke.points.length < 2) {
      continue;
    }

    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x * canvas.width, stroke.points[0].y * canvas.height);

    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x * canvas.width, stroke.points[i].y * canvas.height);
    }

    ctx.stroke();
  }
}

export function DrawingCanvas({ strokes, onStroke, onClear }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const currentPointsRef = useRef<Point[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (canvas) {
      drawStrokes(canvas, strokes);
    }
  }, [strokes]);

  function getCanvasPoint(event: React.MouseEvent<HTMLCanvasElement>): Point {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height
    };
  }

  function handleMouseDown(event: React.MouseEvent<HTMLCanvasElement>) {
    if (!onStroke) {
      return;
    }

    setIsDrawing(true);
    const point = getCanvasPoint(event);
    currentPointsRef.current = [point];

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(point.x * canvas.width, point.y * canvas.height);
  }

  function handleMouseMove(event: React.MouseEvent<HTMLCanvasElement>) {
    if (!onStroke || !isDrawing) {
      return;
    }

    const point = getCanvasPoint(event);
    currentPointsRef.current.push(point);

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineTo(point.x * canvas.width, point.y * canvas.height);
    ctx.stroke();
  }

  function handleMouseUp() {
    if (!onStroke || !isDrawing) {
      return;
    }

    setIsDrawing(false);
    const points = currentPointsRef.current;
    currentPointsRef.current = [];

    if (points.length >= 2) {
      onStroke(points);
    }
  }

  function handleMouseLeave() {
    if (isDrawing) {
      handleMouseUp();
    }
  }

  const isDrawerMode = !!onStroke;

  return (
    <div className="drawing-canvas">
      <canvas
        ref={canvasRef}
        width={600}
        height={400}
        style={{
          display: "block",
          width: "100%",
          backgroundColor: "#ffffff",
          border: "1px solid #e5e7eb",
          cursor: isDrawerMode ? "crosshair" : "default",
          touchAction: "none"
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
      {onClear && (
        <div className="button-row button-row--compact" style={{ marginTop: "0.5rem" }}>
          <button className="button button--secondary" type="button" onClick={onClear}>
            Clear Canvas
          </button>
        </div>
      )}
    </div>
  );
}

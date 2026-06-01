import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import { GuessForm } from "../components/GuessForm";
import { ResultPanel } from "../components/ResultPanel";
import { RoomCodeBadge } from "../components/RoomCodeBadge";
import { Scoreboard } from "../components/Scoreboard";
import { useRoomState } from "../state/roomStore";

export function GamePage() {
  const navigate = useNavigate();
  const { room, participantId } = useRoomState();

  useEffect(() => {
    if (!room) {
      navigate("/", { replace: true });
    }
  }, [navigate, room]);

  if (!room) {
    return null;
  }

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState("#000000");
  const [brushWidth, setBrushWidth] = useState(4);
  const [localLines, setLocalLines] = useState<any[]>([]);

  // Identify the player's viewer record from the room snapshot
  const viewer = room.participants.find((participant) => participant.id === participantId) ?? null;

  // Identify the player's role string from the viewer snapshot record
  const currentRole = viewer?.role || "guesser";

  // Polling Loop: Sync ongoing brush stroke line vectors from the server data layer
  useEffect(() => {
    if (!room) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:3000/api/rooms/${room.code}`);
        if (res.ok) {
          const data = await res.json();
          if (data.room && data.room.canvasLines) {
            setLocalLines(data.room.canvasLines);
          }
        }
      } catch (err) {
        console.error("Canvas synchronization short-poll failed:", err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [room]);

  // Render Engine Loop: Redraw strokes matrix onto the HTML5 element context when updates sync
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear board and redraw historical vector maps cleanly
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    localLines.forEach((line: any) => {
      ctx.beginPath();
      ctx.strokeStyle = line.color || "#000000";
      ctx.lineWidth = line.width || 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      
      if (line.points && line.points.length > 0) {
        ctx.moveTo(line.points[0].x, line.points[0].y);
        for (let i = 1; i < line.points.length; i++) {
          ctx.lineTo(line.points[i].x, line.points[i].y);
        }
        ctx.stroke();
      }
    });
  }, [localLines]);

  // Drawing Path Network Actions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (currentRole !== "drawer") return; // AC-02: Lockout guesser interactions
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    setIsDrawing(true);
    const startPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    
    const newLine = {
      color: brushColor,
      width: brushWidth,
      points: [startPoint]
    };
    setLocalLines(prev => [...prev, newLine]);
  };

  const drawPoints = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || currentRole !== "drawer") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const currentPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    setLocalLines(prev => {
      const updated = [...prev];
      if (updated.length === 0) return prev;
      const lastLine = { ...updated[updated.length - 1] };
      lastLine.points = [...lastLine.points, currentPoint];
      updated[updated.length - 1] = lastLine;
      return updated;
    });
  };

  const stopDrawing = async () => {
    if (!isDrawing || currentRole !== "drawer" || !room) return;
    setIsDrawing(false);

    // Broadcast last individual structural path down to the backend rooms store pipeline
    const lastLine = localLines[localLines.length - 1];
    if (!lastLine) return;

    try {
      await fetch(`http://localhost:3000/api/rooms/${room.code}/canvas`, {
        method: "POST",
        headers: { "Content
import React, { useEffect, useState } from "react";

const ObsInterface: React.FC = () => {
  const [ws, setWS] = useState<WebSocket | null>(null);
  const wsRef = React.useRef<WebSocket | null>(null);
  const [ballots, setBallots] = useState<number[]>([]);
  const [figures, setFigures] = useState<string[]>([]);

  useEffect(() => {
    if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
      const newWs = new WebSocket("ws://localhost:3000");

      newWs.onopen = () => {
        console.log("Conexión establecida con el servidor WebSocket");
        // Aquí puedes enviar mensajes al servidor si es necesario
        // Ejemplo: newWs.send('Hola servidor, soy el cliente');
      };

      newWs.onmessage = (event) => {
        console.log("Mensaje recibido:", event.data);
        const data = JSON.parse(event.data);
        setBallots(data.balls);
        setFigures(data.figures);
        console.log(data);
        // Aquí puedes manejar los mensajes recibidos desde el servidor WebSocket
      };

      newWs.onerror = (error) => {
        console.error("Error en la conexión WebSocket:", error);
      };

      newWs.onclose = () => {
        console.log("Conexión WebSocket cerrada");
      };

      wsRef.current = newWs;
      setWS(newWs);
    }

    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <div>
      <h1>Interfaz de OBS</h1>
      <span>{ballots}</span>
    </div>
  );
};

export default ObsInterface;

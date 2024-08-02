import React, { useEffect, useState } from "react";
import styled from "styled-components";

const ObsInterface: React.FC = () => {
  const [ws, setWS] = useState<WebSocket | null>(null);
  const wsRef = React.useRef<WebSocket | null>(null);
  const [ballots, setBallots] = useState<number[]>([]);
  const [figures, setFigures] = useState<any | null >(null);

  useEffect(() => {
    if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
      const newWs = new WebSocket("ws://localhost:3000");

      newWs.onopen = () => {
        console.log("Conexión establecida con el servidor WebSocket");
        // Aquí puedes enviar mensajes al servidor si es necesario
        // Ejemplo: newWs.send('Hola servidor, soy el cliente');
      };

      newWs.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'game-reset') {
          setBallots([]);
          setFigures([]);
        } else if (data.type === 'game-update') {
          setBallots(data.balls);
          setFigures(data.figures);
        } else if (data.type === 'figures-update') {
          setFigures(data.figures);
        }
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

  const columns = {
    B: Array.from({ length: 15 }, (_, i) => i + 1),
    I: Array.from({ length: 15 }, (_, i) => i + 16),
    N: Array.from({ length: 15 }, (_, i) => i + 31),
    G: Array.from({ length: 15 }, (_, i) => i + 46),
    O: Array.from({ length: 15 }, (_, i) => i + 61),
  };
  console.log("figuras::",figures);

  return (
    <ObsInterfaceStyle>
      <div className="obs-interface">
        <div className="figures-list">
          {figures && (
            figures.map((figure: any) => (
              <div key={figure.id} className="figure">
                <h5>{figure.name}</h5>
                <div className="pattern">
                  {figure.pattern.map((row: boolean[], rowIndex: number) => (
                    <div key={rowIndex} className="rows">
                      {row.map((cell: boolean, cellIndex: number) => (
                        <div key={`${rowIndex}-${cellIndex}`}>
                          <div className={`cell ${cell ? 'active' : ''}`}></div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="ballot-panel">
          {Object.entries(columns).map(([letter, numbers]) => (
            <div key={letter} className="column">
              <div className="letter">{letter}</div>
              {numbers.map((number) => (
                <div
                  key={number}
                  className={`ballot ${ballots.includes(number) ? "marked" : ""}`}
                >
                  <h5 className="number">{number}</h5>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </ObsInterfaceStyle>
  );
};

export default ObsInterface;

const ObsInterfaceStyle = styled.div `
  .obs-interface {
    display: flex;
    justify-content: flex-end;
    background-color: green;
    height: 100vh;
    width: 100%;
    padding: 5rem 15rem;
  }
  .ballot-panel {
    display: flex;
    gap: 0.225rem;
  }
  .column {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .letter {
    font-weight: bold;
    margin-bottom: 10px;
  }
  .ballot {
    width: 60px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #000;
    border-radius: 6px;
    background-color: #f0f0f0;
    margin-bottom: 5px;
  }
  .number {
    font-size: 2rem;
    font-weight: 700;
    margin: 0;
  }
  .ballot.marked {
    background-color: var(--color-danger-600);
    color: var(--color-light);
  }
  .figures-list {
    display: flex;
    flex-direction: column;
    margin-right: 1rem;
  }
  .figure {
    margin-bottom: 20px;
    color: var(--color-light);
  }
  .pattern {
    display: flex;
    flex-direction: column;
    background-color: rgb(235,235,235);
    padding: var(--p-1);
    border-radius: 6px;
  }
  .rows {
    display: flex;
  }
  .cell {
    width: 30px;
    height: 30px;
    background-color: var(--color-light);
    border-radius: 4px;
    margin: 1px;
  }
  .cell.active {
    background-color: var(--color-danger-600);
  }

`

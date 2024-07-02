import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as WebSocketServer } from 'ws';
import bingoRoutes from './routes/bingoRoutes';
import bingoFigureRouter from './routes/bingoFigureRoutes';
import bingoGameRouter from './routes/bingoGameRoutes';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.use(bingoRoutes);
app.use(bingoFigureRouter);
app.use(bingoGameRouter);

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('Nuevo cliente conectado');

  ws.on('message', (message) => {
    console.log(`Mensaje recibido: ${message}`);
  });

  ws.on('close', () => {
    console.log('Cliente desconectado');
  });
});

server.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});

export { wss };

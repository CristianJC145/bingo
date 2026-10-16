import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as WebSocketServer } from 'ws';
import bingoRoutes from './routes/bingoRoutes';
import bingoFigureRouter from './routes/bingoFigureRoutes';
import bingoGameRouter from './routes/bingoGameRoutes';
import soundEffectRouter from './routes/soundEffectRoutes';
import sponsorRouter from './routes/sponsorRoutes';
import obsBrandingRouter from './routes/obsBrandingRoutes';
import printTemplateRouter from './routes/printTemplateRoutes';
import ballVoiceRouter from './routes/ballVoiceRoutes';
import authRouter from './routes/authRoutes';
import slotMachineRouter from './routes/slotMachineRoutes';
import slotWinnerSoundRouter from './routes/slotWinnerSoundRoutes';
import path from 'path';
import { ensureAuthTables } from './services/authStore';
import { getSlotState } from './controllers/slotMachineController';
import { getBroadcastState, updateBroadcastState } from './services/broadcastState';
import { ensureGameSessionTable, loadGameSession } from './services/gameSessionStore';
import { loadGameSettings } from './services/gameSettingsStore';
import { getActiveWinners, hydratePreviousWinners } from './controllers/bingoGameController';
import { ensureWinnerHistoryTable } from './services/winnerHistoryStore';

const app = express();
const port = Number(process.env.BINGO_PORT ?? 3000);

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use('/sounds/custom', express.static(path.resolve(process.cwd(), 'storage', 'sounds')));
app.use('/sponsors/media', express.static(path.resolve(process.cwd(), 'storage', 'sponsors')));
app.use('/obs-branding/media', express.static(path.resolve(process.cwd(), 'storage', 'obs-branding')));
app.use('/print-templates/media', express.static(path.resolve(process.cwd(), 'storage', 'print-templates')));
app.use('/ball-voices/media', express.static(path.resolve(process.cwd(), 'storage', 'ball-voices')));
app.use('/slot-winner-sound/media', express.static(path.resolve(process.cwd(), 'storage', 'slot-winner-sound')));

app.use(bingoRoutes);
app.use(bingoFigureRouter);
app.use(bingoGameRouter);
app.use(soundEffectRouter);
app.use(sponsorRouter);
app.use(obsBrandingRouter);
app.use(printTemplateRouter);
app.use(ballVoiceRouter);
app.use(authRouter);
app.use(slotMachineRouter);
app.use(slotWinnerSoundRouter);

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('Nuevo cliente conectado');
  ws.send(JSON.stringify({ type: 'game-update', ...getBroadcastState() }));
  // Un cliente que se reconecta debe recuperar los overlays que siguen visibles.
  const winners = getActiveWinners();
  if (winners.length > 0) ws.send(JSON.stringify({ type: 'game-update', winner: true, winningCards: winners, ...getBroadcastState() }));
  const slotState = getSlotState();
  if (slotState.active) ws.send(JSON.stringify({ type: slotState.result ? 'slot-spin' : 'slot-open', ...slotState }));

  ws.on('message', (message) => {
    console.log(`Mensaje recibido: ${message}`);
  });

  ws.on('close', () => {
    console.log('Cliente desconectado');
  });
});

server.listen(port, async () => {
  await ensureAuthTables();
  await ensureGameSessionTable();
  await ensureWinnerHistoryTable();
  await loadGameSettings();
  const session = await loadGameSession();
  updateBroadcastState({ balls: session.balls, figures: session.selectedFigures });
  hydratePreviousWinners(session.previousWinners);
  console.log(`Servidor corriendo en http://localhost:${port}`);
});

export { wss };

// src/services/indexedDBService.ts
import { openDB } from 'idb';

const DB_NAME = 'BingoDB';
const DB_VERSION = 1;
const BINGO_CARDS_STORE = 'bingoCards';
const METADATA_STORE = 'metadata';

const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(BINGO_CARDS_STORE)) {
        db.createObjectStore(BINGO_CARDS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(METADATA_STORE)) {
        db.createObjectStore(METADATA_STORE, { keyPath: 'key' });
      }
    },
  });
};

export const saveBingoCard = async (bingoCard: { id: number; card: number[][] }) => {
  const db = await initDB();
  await db.put(BINGO_CARDS_STORE, bingoCard);
};

export const getBingoCards = async () => {
  const db = await initDB();
  return await db.getAll(BINGO_CARDS_STORE);
};

export const getLastBingoCardId = async () => {
  const db = await initDB();
  const metadata = await db.get(METADATA_STORE, 'lastBingoCardId');
  return metadata ? metadata.lastId : 0;
};

export const setLastBingoCardId = async (lastId: number) => {
  const db = await initDB();
  await db.put(METADATA_STORE, { key: 'lastBingoCardId', lastId });
};

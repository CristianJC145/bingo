import React from "react";
import FigureEditor from "./FigureEditor";

// Legacy entry point kept for compatibility. FigureManager is the routed screen.
const BingoGame: React.FC = () => (
  <FigureEditor onSave={() => undefined} onClose={() => undefined} />
);

export default BingoGame;

import React from "react";
import styled from "styled-components";

interface AppFooterProps { style?: React.CSSProperties; }

const AppFooter: React.FC<AppFooterProps> = ({ style }) => (
  <AppFooterStyles>
    <footer style={style}>
      <span>Bingo Control Studio</span>
      <span>Operación local · 2026</span>
    </footer>
  </AppFooterStyles>
);

export default AppFooter;

const AppFooterStyles = styled.div`
  footer { display: flex; align-items: center; justify-content: space-between; padding: 1.25rem clamp(1rem, 3vw, 2.5rem) 1.75rem; color: var(--text-muted); font-size: .68rem; }
  @media (max-width: 520px) { footer { flex-direction: column; gap: .35rem; } }
`;

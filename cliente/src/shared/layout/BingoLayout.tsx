import React, { ReactNode, useCallback, useState } from "react";
import styled from "styled-components";
import AppSidebar from "./AppSidebar";
import AppFooter from "./AppFooter";
import AppNavbar from "./AppNavbar";

interface BingoLayoutProps { children: ReactNode; namePage: string; routePage: string; level?: number; }

const BingoLayout: React.FC<BingoLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [smallSidebar, setSmallSidebar] = useState(false);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setIsSidebarOpen((value) => !value), []);

  return (
    <BingoLayoutStyles>
      <AppSidebar isOpen={isSidebarOpen} onClose={closeSidebar} onSmallSidebar={setSmallSidebar} />
      <main className={`main-shell ${smallSidebar ? "small-sidebar" : ""}`}>
        <AppNavbar toggleSidebar={toggleSidebar} />
        <div className="page-content">{children}</div>
        <AppFooter />
      </main>
    </BingoLayoutStyles>
  );
};

export default BingoLayout;

const BingoLayoutStyles = styled.div`
  .main-shell { display: flex; min-height: 100vh; flex-direction: column; transition: margin-left .25s ease; }
  .page-content { width: 100%; max-width: 1640px; flex: 1; align-self: center; padding: 1.5rem clamp(1rem, 3vw, 2.5rem) 2rem; }
  @media (min-width: 992px) { .main-shell { margin-left: 260px; } .main-shell.small-sidebar { margin-left: 86px; } .page-content { padding-top: 1.25rem; } }
`;

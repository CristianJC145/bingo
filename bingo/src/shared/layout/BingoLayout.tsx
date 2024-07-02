import React, { ReactNode, useState } from "react";
import styled from "styled-components";

import AppSidebar from "./AppSidebar";
import AppFooter from "./AppFooter";
import AppNavbar from "./AppNavbar";

interface BingoLayoutProps {
  children: ReactNode;
  namePage: string;
  routePage: string;
  level?: number;
}

const BingoLayout: React.FC<BingoLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [smallSidebar, setSmallSidebar] = useState<unknown>();

  const onSmallSidebar = (value: unknown) => {
    setSmallSidebar(value);
  };

  const handleSidebarClose = () => {
    setIsSidebarOpen(false);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <BingoLayoutStyles>
      <AppSidebar
        isOpen={isSidebarOpen}
        onClose={handleSidebarClose}
        onSmallSidebar={onSmallSidebar}
      ></AppSidebar>
      <main
        className={`vs-main-content ${smallSidebar ? "small-sidebar" : ""}`}
      >
        <AppNavbar toggleSidebar={toggleSidebar}></AppNavbar>
        <div className="vs-content">{children}</div>
        <AppFooter></AppFooter>
      </main>
    </BingoLayoutStyles>
  );
};

export default BingoLayout;

const BingoLayoutStyles = styled.div`
  .vs-main-content {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }
  .vs-content {
    padding: var(--p-6) var(--p-6);
    flex-grow: 1;
    background-color: transparent;
  }
  @media (min-width: 992px) {
    .vs-content {
      padding: var(--p-6) var(--p-8);
    }
    .vs-main-content {
      margin-left: 220px;
      transition: all 0.3s ease;
    }
    .vs-main-content.small-sidebar {
      margin-left: 72px;
    }
  }
`;

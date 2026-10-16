import React from "react";
import { Navigate } from "react-router-dom";
import styled from "styled-components";
import AppIcon from "../../../shared/components/AppIcon";
import { useAuth } from "../context/AuthContext";

const LoadingScreen: React.FC = () => (
  <LoadingStyle><AppIcon icon="rotate" /><span>Cargando…</span></LoadingStyle>
);

export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export const RequireAdmin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/registro/cartones" replace />;
  return <>{children}</>;
};

const LoadingStyle = styled.div`
  display: flex;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: .8rem;
  color: var(--text-muted);
  font-size: .78rem;
  svg { font-size: 1.4rem; animation: spin 1.1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

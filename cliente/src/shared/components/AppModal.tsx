import React from "react";
import styled from "styled-components";
import { SizeConstant } from "../constant/size.constants";

interface ModalProps { isOpen: boolean; onClose: () => void; children: React.ReactNode; title: string; size?: SizeConstant; }

const AppModal: React.FC<ModalProps> = ({ isOpen, onClose, children, title, size }) => {
  if (!isOpen) return null;
  return (
    <AppModalStyle>
      <div className="modal-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
        <section className={`modal-container ${size ?? ""}`} role="dialog" aria-modal="true" aria-label={title}>
          <header className="modal-header"><div><span>Control Studio</span><h3>{title}</h3></div><button className="modal-close" onClick={onClose} aria-label="Cerrar">×</button></header>
          <div className="modal-content">{children}</div>
        </section>
      </div>
    </AppModalStyle>
  );
};

export default AppModal;

const AppModalStyle = styled.div`
  .modal-overlay { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: 1rem; background: rgba(3,5,9,.78); backdrop-filter: blur(8px); animation: fade-in .16s ease-out; }
  .modal-container { width: min(100%, 480px); max-height: calc(100vh - 2rem); overflow: auto; background: linear-gradient(145deg, rgba(255,255,255,.025), transparent 55%), var(--bg-panel-raised); border: 1px solid var(--border-strong); border-radius: 20px; box-shadow: var(--shadow-float); animation: modal-in .2s ease-out; }
  .modal-container.md { width: min(100%, 880px); }
  .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-subtle); }
  .modal-header > div { display: flex; flex-direction: column; }
  .modal-header span { color: var(--color-secondary); font-size: .62rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
  .modal-header h3 { margin: .25rem 0 0; color: var(--text-primary); font-size: 1rem; font-weight: 600; }
  .modal-close { display: grid; width: 34px; height: 34px; place-items: center; padding: 0; color: var(--text-secondary); background: rgba(255,255,255,.045); border: 1px solid var(--border-subtle); border-radius: 10px; font-size: 1.25rem; cursor: pointer; }
  .modal-close:hover { color: #fff; background: rgba(255,255,255,.08); }
  .modal-content { padding: 1.25rem 1.5rem 1.5rem; }
  @keyframes fade-in { from { opacity: 0; } }
  @keyframes modal-in { from { opacity: 0; transform: translateY(8px) scale(.985); } }
`;

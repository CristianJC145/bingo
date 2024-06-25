import React from 'react';
import styled from 'styled-components';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}

const AppModal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;

  return (
    <AppModalStyle>
        <div className="modal-overlay">
        <div className='modal-container'>
          <div className='modal-header'>
            <div className='header-title'>
              {title}
            </div>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
          <div className="modal-content">
              {children}
          </div>
        </div>
        </div>
    </AppModalStyle>
  );
};

export default AppModal;

const AppModalStyle = styled.div`
  .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
  }
  .modal-container {
    background: white;
    max-width: 450px;
    border-radius: 16px;
  }
  .modal-content {
      position: relative;
      padding: 1rem 2rem;
  }

  .modal-close {
      position: absolute;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0.5rem;
      top: 3;
      right: 0;
      width: 25px;
      height: 25px;
      font-size: 1.5rem;
      color: var(--color-gray-300);      
      border: none;
      background-color: unset;
      cursor: pointer;
  }
  .modal-header {
    position: relative
  }
  .header-title {
    font-weight: 700;
    font-size: 16px;
    width: 100%;
    border-bottom: 1px solid rgba(var(--color-gray-300-rgb), .2);
    padding: 1rem 2rem;
  }

`
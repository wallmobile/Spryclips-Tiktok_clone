import React from 'react';
import ReactDOM from 'react-dom';
import './ConfirmationModal.css';

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning', // 'warning', 'danger', 'info', 'success'
  icon = null,
  showIcon = true,
  confirmButtonClass = '',
  cancelButtonClass = '',
  children
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    if (icon) return icon;
    switch (type) {
      case 'danger':
        return 'fa-solid fa-exclamation-triangle';
      case 'warning':
        return 'fa-solid fa-exclamation-circle';
      case 'info':
        return 'fa-solid fa-info-circle';
      case 'success':
        return 'fa-solid fa-check-circle';
      default:
        return 'fa-solid fa-question-circle';
    }
  };

  const getTypeClass = () => {
    switch (type) {
      case 'danger':
        return 'confirmation-modal-danger';
      case 'warning':
        return 'confirmation-modal-warning';
      case 'info':
        return 'confirmation-modal-info';
      case 'success':
        return 'confirmation-modal-success';
      default:
        return '';
    }
  };

  return ReactDOM.createPortal(
    <div className="confirmation-modal-overlay" onClick={onClose}>
      <div 
        className={`confirmation-modal ${getTypeClass()}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirmation-modal-header">
          {showIcon && (
            <div className="confirmation-modal-icon">
              <i className={getIcon()}></i>
            </div>
          )}
          <h3>{title}</h3>
        </div>
        
        <div className="confirmation-modal-body">
          <p>{message}</p>
          {children && <div className="confirmation-modal-content">{children}</div>}
        </div>
        
        <div className="confirmation-modal-footer">
          <button
            className={`confirmation-modal-cancel ${cancelButtonClass}`}
            onClick={onClose}
          >
            {cancelText}
          </button>
          <button
            className={`confirmation-modal-confirm ${confirmButtonClass} ${type === 'danger' ? 'confirmation-modal-confirm-danger' : ''}`}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmationModal;


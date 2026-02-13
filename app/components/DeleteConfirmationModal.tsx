'use client'

import { useState, useEffect } from 'react'

interface DeleteConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message?: string
  itemName?: string
  isDeleting?: boolean
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Delete Confirmation',
  message,
  itemName,
  isDeleting = false
}: DeleteConfirmationModalProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      // Small delay to trigger animation
      setTimeout(() => setIsAnimating(true), 10)
    } else {
      setIsAnimating(false)
      setTimeout(() => setIsVisible(false), 200)
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isDeleting) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, isDeleting, onClose])

  if (!isVisible) return null

  const defaultMessage = itemName 
    ? `Are you sure you want to delete "${itemName}"? This action cannot be undone.`
    : 'Are you sure you want to delete this item? This action cannot be undone.'

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isDeleting) {
      onClose()
    }
  }

  return (
    <div 
      className={`modal-backdrop ${isAnimating ? 'visible' : ''}`}
      onClick={handleBackdropClick}
    >
      <div className={`modal-container ${isAnimating ? 'visible' : ''}`}>
        <div className="modal-header">
          <div className="modal-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h3 className="modal-title">{title}</h3>
        </div>
        
        <div className="modal-body">
          <p className="modal-message">{message || defaultMessage}</p>
          <div className="modal-warning">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>This action is permanent and cannot be reversed.</span>
          </div>
        </div>

        <div className="modal-footer">
          <button 
            className="modal-btn modal-btn-secondary"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button 
            className="modal-btn modal-btn-danger"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spin">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
                Deleting...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
                Delete
              </>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .modal-backdrop.visible {
          opacity: 1;
        }
        .modal-container {
          background: linear-gradient(135deg, rgba(25, 25, 35, 0.95), rgba(20, 20, 30, 0.98));
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 16px;
          width: 100%;
          max-width: 420px;
          margin: 20px;
          box-shadow: 
            0 25px 50px -12px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(255, 255, 255, 0.05),
            0 0 40px rgba(239, 68, 68, 0.1);
          transform: scale(0.95) translateY(10px);
          opacity: 0;
          transition: all 0.2s ease;
          overflow: hidden;
        }
        .modal-container.visible {
          transform: scale(1) translateY(0);
          opacity: 1;
        }
        .modal-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 24px 24px 0;
        }
        .modal-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent-red, #ef4444);
          flex-shrink: 0;
        }
        .modal-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary, #ffffff);
          margin: 0;
        }
        .modal-body {
          padding: 16px 24px;
        }
        .modal-message {
          font-size: 14px;
          color: var(--text-secondary, rgba(255, 255, 255, 0.6));
          line-height: 1.6;
          margin: 0 0 16px;
        }
        .modal-warning {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 14px;
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 10px;
          font-size: 12px;
          color: rgba(239, 68, 68, 0.9);
        }
        .modal-warning svg {
          flex-shrink: 0;
          margin-top: 1px;
        }
        .modal-footer {
          display: flex;
          gap: 10px;
          padding: 0 24px 24px;
        }
        .modal-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 20px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          border: none;
        }
        .modal-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .modal-btn-secondary {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text-secondary, rgba(255, 255, 255, 0.6));
        }
        .modal-btn-secondary:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.15);
          color: var(--text-primary, #ffffff);
        }
        .modal-btn-danger {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          border: 1px solid rgba(239, 68, 68, 0.4);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
        }
        .modal-btn-danger:hover:not(:disabled) {
          background: linear-gradient(135deg, #f87171, #ef4444);
          box-shadow: 0 6px 16px rgba(239, 68, 68, 0.35);
          transform: translateY(-1px);
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

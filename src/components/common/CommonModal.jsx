import React from 'react'

const CommonModal = ({open, onClose, children, showCloseButton = true}) => {
    if(!open) return null;

  return (
    <div style={styles.overlay}>
        <div style={styles.modal}>
            {children} 
            
        </div>
    </div>
  )
}

export default CommonModal

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.35)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  modal: {
    position: "relative",
    background: "#fff",
    padding: "24px",
    borderRadius: "12px",
    minWidth: "420px",
    zIndex: 10000,
  },
  close: {
    position: "absolute",
    top: "12px",
    right: "12px",
    zIndex: 10001,
  },
};
import React from 'react'

const RegisterButton = ({ type = "button", onClick, children = "등록" }) => {
  return (
    <button type={type} onClick={onClick} className="btn btn-primary">
      {children}
    </button>
  )
}

export default RegisterButton
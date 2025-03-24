import React from "react";
import { useNavigate } from "react-router-dom";
import { ActionButtonProps } from "../types/types";

export const ActionButton: React.FC<ActionButtonProps> = ({
  icon,
  label,
  bgColor,
  onClick,
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (label === "Make Booking") {
      navigate("/make-booking");
    } else if (onClick) {
      onClick();
    }
  };

  return (
    <button
      className={`flex w-full items-center gap-3 px-4 py-3 ${bgColor} rounded-lg hover:brightness-95 transition-all duration-300`}
      aria-label={label}
      onClick={handleClick}
    >
      <div className="bg-white/20 p-2 rounded-md">
        <img
          loading="lazy"
          src={icon}
          className="object-contain w-5 h-5"
          alt=""
        />
      </div>
      <span className="text-white font-medium">{label}</span>
      <svg 
        className="w-5 h-5 text-white/70 ml-auto" 
        viewBox="0 0 20 20" 
        fill="currentColor"
      >
        <path 
          fillRule="evenodd" 
          d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" 
          clipRule="evenodd" 
        />
      </svg>
    </button>
  );
};

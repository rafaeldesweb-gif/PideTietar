import React from 'react';
import brandLogo from '../assets/logo.png';

interface ProjectLogoProps {
  variant?: 'badge' | 'full';
  className?: string;
  alt?: string;
}

export const ProjectLogo: React.FC<ProjectLogoProps> = ({
  className = '',
  alt = 'PideTiétar'
}) => {
  return (
    <img
      src={brandLogo}
      alt={alt}
      className={`${className} m-0 block select-none bg-transparent object-contain p-0`}
      draggable={false}
    />
  );
};

import React from 'react';
import brandLogo from '../assets/logo.png';

interface ProjectLogoProps {
  variant?: 'badge' | 'full' | 'split';
  className?: string;
  alt?: string;
}

export const ProjectLogo: React.FC<ProjectLogoProps> = ({
  variant = 'full',
  className = '',
  alt = 'PideTiétar'
}) => {
  if (variant === 'split') {
    return (
      <span className={`project-logo-split ${className}`.trim()} role="img" aria-label={alt}>
        <span className="project-logo-split__mark" aria-hidden="true">
          <img src={brandLogo} alt="" draggable={false} />
        </span>
        <span className="project-logo-split__wordmark" aria-hidden="true">
          <img src={brandLogo} alt="" draggable={false} />
        </span>
      </span>
    );
  }

  return (
    <img
      src={brandLogo}
      alt={alt}
      className={`${className} m-0 block select-none bg-transparent object-contain p-0`}
      draggable={false}
    />
  );
};

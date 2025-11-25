import React from 'react';

// Since the dataset uses emojis mostly to match the screenshot accurately,
// but we want to be ready for Lucide icons if needed.
export const IconWrapper: React.FC<{ icon: string }> = ({ icon }) => {
  return (
    <span className="text-xl mr-2 filter drop-shadow-sm">{icon}</span>
  );
};
import React from 'react';

export type OptionalProps = {
  when: boolean;
  children: React.ReactNode;
};

export const Optional: React.FC<OptionalProps> = ({when, children}) => {
  return when ? children : null;
};

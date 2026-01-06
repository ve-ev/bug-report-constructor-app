import React, {memo} from 'react';
import {Constructor} from './components/constructor.tsx';

const AppComponent: React.FunctionComponent = () => {
  return (
    <div className="widget">
      <Constructor/>
    </div>
  );
};

export const App = memo(AppComponent);

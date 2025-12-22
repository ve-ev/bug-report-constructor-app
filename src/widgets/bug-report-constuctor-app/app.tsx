import React, {memo, useState} from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import {ApiPlayground} from './api-playground.tsx';
import {Constructor} from './components/constructor.tsx';

const AppComponent: React.FunctionComponent = () => {
  const [showPlayground, setShowPlayground] = useState(false);

  return (
    <div className="widget">
      <div className="topBar">
        <Button inline onClick={() => setShowPlayground(v => !v)}>
          {showPlayground ? 'Hide debug' : 'Debug'}
        </Button>
      </div>

      <Constructor/>

      {showPlayground && <ApiPlayground/>}
    </div>
  );
};

export const App = memo(AppComponent);

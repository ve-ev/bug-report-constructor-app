import React, {memo, useCallback, useState} from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import {ApiPlayground} from './api-playground.tsx';
import {Constructor} from './components/constructor.tsx';

const AppComponent: React.FunctionComponent = () => {
  const [showPlayground, setShowPlayground] = useState(false);

  const onTogglePlayground = useCallback(() => {
    setShowPlayground(v => !v);
  }, []);

  return (
    <div className="widget">
      <div className="topBar">
        <Button inline onClick={onTogglePlayground}>
          {showPlayground ? 'Hide debug' : 'Debug'}
        </Button>
      </div>

      <Constructor/>

      {showPlayground && <ApiPlayground/>}
    </div>
  );
};

export const App = memo(AppComponent);

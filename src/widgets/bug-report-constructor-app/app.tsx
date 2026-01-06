import React, {memo, useState, useCallback} from 'react';

import {ApiPlayground} from './api-playground.tsx';
import {Constructor} from './components/constructor.tsx';

const AppComponent: React.FunctionComponent = () => {
  const [showPlayground, setShowPlayground] = useState(false);
  const [playgroundUnlocked, setPlaygroundUnlocked] = useState(false);

  const openPlayground = useCallback(() => {
    setShowPlayground(true);
  }, []);

  const closePlayground = useCallback(() => {
    setShowPlayground(false);
  }, []);

  return (
    <div className="widget">
      {showPlayground ? (
        <ApiPlayground onClose={closePlayground}/>
      ) : (
        <Constructor
          onOpenPlayground={openPlayground}
          playgroundUnlocked={playgroundUnlocked}
          onUnlockPlayground={() => setPlaygroundUnlocked(true)}
        />
      )}
    </div>
  );
};

export const App = memo(AppComponent);

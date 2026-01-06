import React, {memo, useMemo, useState, useCallback} from 'react';

import {ApiPlayground} from './api-playground.tsx';
import {Constructor} from './components/constructor.tsx';

function shouldShowApiPlayground(): boolean {
  const search = window.location?.search ?? '';
  const hash = window.location?.hash ?? '';
  return /(?:\?|&)(?:apiPlayground|playground)=1(?:&|$)/.test(search) || /(?:\?|&)(?:apiPlayground|playground)=1(?:&|$)/.test(hash);
}

const AppComponent: React.FunctionComponent = () => {
  const initialShowPlayground = useMemo(() => shouldShowApiPlayground(), []);
  const [showPlayground, setShowPlayground] = useState(initialShowPlayground);

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
        <Constructor onOpenPlayground={openPlayground}/>
      )}
    </div>
  );
};

export const App = memo(AppComponent);

import React, {memo} from 'react';

import {ApiPlayground} from './api-playground.tsx';
import {Constructor} from './components/constructor.tsx';
import {TopPanel} from './components/top-panel.tsx';
import {BottomPanel} from './components/bottom-panel.tsx';
import {ConstructorStoreProvider, useConstructorStore} from './store/constructor-store.tsx';

const AppContent: React.FC = () => {
  const {showPlayground, closePlayground, topPanelProps, bottomPanelProps} = useConstructorStore();

  return (
    <div className="widget">
      {showPlayground ? (
        <ApiPlayground onClose={closePlayground}/>
      ) : (
        <>
          <div className="flex flex-col gap-4 pb-24">
            <TopPanel {...topPanelProps} />
            <Constructor />
          </div>
          <BottomPanel {...bottomPanelProps} />
        </>
      )}
    </div>
  );
};

const AppComponent: React.FunctionComponent = () => {
  return (
    <ConstructorStoreProvider>
      <AppContent />
    </ConstructorStoreProvider>
  );
};

export const App = memo(AppComponent);

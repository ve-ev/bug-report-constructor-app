import React, {memo, useCallback} from 'react';
import {Constructor} from './components/constructor.tsx';
import {TwButton} from './components/tw-button.tsx';

const AppComponent: React.FunctionComponent = () => {
  const resetRef = React.useRef<(() => void) | null>(null);

  const onRegisterReset = useCallback((fn: (() => void) | null) => {
    resetRef.current = fn;
  }, []);

  const onResetForm = useCallback(() => {
    resetRef.current?.();
  }, []);

  return (
    <div className="widget">
      <div className="topBar">
        <TwButton onClick={onResetForm}>
          Reset form
        </TwButton>
      </div>

      <Constructor onRegisterReset={onRegisterReset}/>
    </div>
  );
};

export const App = memo(AppComponent);

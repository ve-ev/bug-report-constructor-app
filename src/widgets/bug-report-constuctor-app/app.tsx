import React, {memo, useCallback} from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import {Constructor} from './components/constructor.tsx';

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
        <Button onClick={onResetForm}>
          Reset form
        </Button>
      </div>

      <Constructor onRegisterReset={onRegisterReset}/>
    </div>
  );
};

export const App = memo(AppComponent);

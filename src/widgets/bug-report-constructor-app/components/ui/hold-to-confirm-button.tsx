import React, {useCallback, useEffect, useId, useMemo, useRef, useState} from 'react';

import {TwButton, type TwButtonProps} from './tw-button.tsx';
import {cx} from '../../utils/tw-utils.ts';

export interface HoldToConfirmButtonProps
  extends Omit<TwButtonProps, 'onClick' | 'onPointerDown' | 'onPointerUp' | 'onPointerCancel' | 'onKeyDown' | 'onKeyUp'> {
  holdMs?: number;
  onHoldComplete: () => void;
}

const DEFAULT_HOLD_MS = 1500;
const TOOLTIP_TRANSIENT_HIDE_MS = 2500;
const PROGRESS_PERCENT_MAX = 100;

export const HoldToConfirmButton: React.FC<HoldToConfirmButtonProps> = props => {
  const {
    holdMs = DEFAULT_HOLD_MS,
    onHoldComplete,
    disabled,
    className,
    title,
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
    children,
    ...rest
  } = props;

  const [progress, setProgress] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipId = useId();
  const isHoldingRef = useRef(false);
  const startAtRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const firedRef = useRef(false);
  const tooltipTimeoutRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    isHoldingRef.current = false;
    startAtRef.current = null;
    firedRef.current = false;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (tooltipTimeoutRef.current !== null) {
      window.clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
    setProgress(0);
    setShowTooltip(false);
  }, []);

  const showTooltipTransient = useCallback(() => {
    if (!title) {
      return;
    }
    setShowTooltip(true);
    if (tooltipTimeoutRef.current !== null) {
      window.clearTimeout(tooltipTimeoutRef.current);
    }
    tooltipTimeoutRef.current = window.setTimeout(() => {
      tooltipTimeoutRef.current = null;
      setShowTooltip(false);
    }, TOOLTIP_TRANSIENT_HIDE_MS);
  }, [title]);

  const tick = useCallback(() => {
    if (!isHoldingRef.current || startAtRef.current === null) {
      return;
    }

    const elapsed = performance.now() - startAtRef.current;
    const next = Math.min(1, holdMs > 0 ? elapsed / holdMs : 1);
    setProgress(next);

    if (next >= 1) {
      if (!firedRef.current) {
        firedRef.current = true;
        onHoldComplete();
      }
      cleanup();
      return;
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [cleanup, holdMs, onHoldComplete]);

  const startHold = useCallback(() => {
    if (disabled) {
      return;
    }
    if (isHoldingRef.current) {
      return;
    }

    isHoldingRef.current = true;
    firedRef.current = false;
    startAtRef.current = performance.now();
    setProgress(0);
    rafRef.current = requestAnimationFrame(tick);
  }, [disabled, tick]);

  const stopHold = useCallback(() => {
    if (!isHoldingRef.current) {
      return;
    }
    cleanup();
  }, [cleanup]);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (disabled) {
        return;
      }

      // Only react to primary button.
      if ('button' in e && typeof e.button === 'number' && e.button !== 0) {
        return;
      }

      // Keep progress stable even if pointer leaves button.
      e.currentTarget.setPointerCapture?.(e.pointerId);
      // Provide a hint for touch/click interactions.
      showTooltipTransient();
      startHold();
    },
    [disabled, showTooltipTransient, startHold]
  );

  const onPointerUp = useCallback(
    () => {
      stopHold();
    },
    [stopHold]
  );

  const onPointerCancel = useCallback(
    () => {
      stopHold();
    },
    [stopHold]
  );

  const onLostPointerCapture = useCallback(() => {
    stopHold();
  }, [stopHold]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) {
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        showTooltipTransient();
        startHold();
      }
    },
    [disabled, showTooltipTransient, startHold]
  );

  const onKeyUp = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        stopHold();
      }
    },
    [stopHold]
  );

  const progressStyle = useMemo<React.CSSProperties>(() => {
    return {
      width: `${Math.round(progress * PROGRESS_PERCENT_MAX)}%`
    };
  }, [progress]);

  return (
    <span className="relative inline-flex">
      <TwButton
        {...rest}
        disabled={disabled}
        className={cx('relative overflow-hidden', className)}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onLostPointerCapture={onLostPointerCapture}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onMouseEnter={e => {
          setShowTooltip(true);
          onMouseEnter?.(e);
        }}
        onMouseLeave={e => {
          setShowTooltip(false);
          onMouseLeave?.(e);
        }}
        onFocus={e => {
          setShowTooltip(true);
          onFocus?.(e);
        }}
        onBlur={e => {
          setShowTooltip(false);
          onBlur?.(e);
        }}
        aria-describedby={title && showTooltip ? tooltipId : undefined}
      >
        <span className="absolute inset-0 overflow-hidden rounded-[inherit]">
          <span
            className="absolute inset-y-0 left-0 bg-[rgba(239,68,68,0.18)]"
            style={progressStyle}
            aria-hidden="true"
          />
        </span>
        <span className="relative z-10">{children}</span>
      </TwButton>

      {title && showTooltip ? (
        <span
          id={tooltipId}
          role="tooltip"
          className={
            'pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md ' +
            'border border-[var(--ring-borders-color)] bg-[var(--ring-content-background-color)] px-2 py-1 text-[12px] leading-4 ' +
            'text-[var(--ring-text-color)] shadow'
          }
        >
          {title}
        </span>
      ) : null}
    </span>
  );
};

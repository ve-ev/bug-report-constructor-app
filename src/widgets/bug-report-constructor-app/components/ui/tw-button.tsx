import React from 'react';

import {cx} from '../../utils/tw-utils.ts';

export type TwButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerGhost';
export type TwButtonSize = 'sm' | 'md' | 'xs';

const SIZE_CLASS_BY_SIZE: Record<TwButtonSize, string> = {
  xs: 'h-8 px-2 text-[12px] leading-4',
  sm: 'h-9 px-2.5 text-[13px] leading-5',
  md: 'h-10 px-3 text-[13px] leading-5'
};

const VARIANT_CLASS_BY_VARIANT: Record<TwButtonVariant, string> = {
  primary: 'border border-pink-500 bg-pink-500 text-white hover:border-pink-600 hover:bg-pink-600 active:bg-pink-700',
  danger: 'border border-red-500 bg-red-500 text-white hover:border-red-600 hover:bg-red-600 active:bg-red-700',
  dangerGhost:
    'bg-transparent text-[var(--ring-text-color)] hover:bg-red-500/10 hover:text-red-600 active:bg-red-500/20 active:text-red-700',
  ghost:
    'bg-transparent text-[var(--ring-text-color)] hover:bg-[rgba(255,0,140,0.10)] active:bg-[rgba(255,0,140,0.18)]',
  secondary:
    'border border-[var(--ring-borders-color)] bg-[var(--ring-content-background-color)] text-[var(--ring-text-color)] ' +
    // Keep hover/active fully opaque (no alpha background) while still providing visual feedback.
    'hover:border-pink-400 hover:bg-[var(--ring-content-background-color)] hover:shadow-sm ' +
    'active:border-pink-500 active:bg-[var(--ring-content-background-color)]'
};

export interface TwButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: TwButtonVariant;
  size?: TwButtonSize;
}

export const TwButton: React.FC<TwButtonProps> = props => {
  const {
    variant = 'secondary',
    size = 'md',
    className,
    disabled,
    ...rest
  } = props;

  const base =
    'inline-flex select-none items-center justify-center gap-1 rounded-md font-medium outline-none transition ' +
    'focus-visible:ring-2 focus-visible:ring-pink-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ring-content-background-color)] ' +
    'disabled:pointer-events-none disabled:opacity-50';

  const sizeClass = SIZE_CLASS_BY_SIZE[size];
  const variantClass = VARIANT_CLASS_BY_VARIANT[variant];

  return (
    <button
      type="button"
      disabled={disabled}
      className={cx(base, sizeClass, variantClass, className)}
      {...rest}
    />
  );
};

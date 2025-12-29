import React from 'react';
import PropTypes from 'prop-types';

import {cx} from './tw-utils.ts';

export type TwTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const TwTextarea: React.FC<TwTextareaProps> = ({className, ...rest}) => {
  return (
    <textarea
      className={cx(
        'w-full resize-y rounded-md border border-[var(--ring-borders-color)] bg-[var(--ring-content-background-color)] px-3 py-2 text-[13px] leading-5 outline-none focus:ring-2 focus:ring-pink-400/60',
        className
      )}
      {...rest}
    />
  );
};

TwTextarea.propTypes = {
  className: PropTypes.string
};

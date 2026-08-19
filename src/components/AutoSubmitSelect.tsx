"use client";

import type { SelectHTMLAttributes } from "react";

export default function AutoSubmitSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { onChange, ...rest } = props;
  return (
    <select
      {...rest}
      onChange={(e) => {
        onChange?.(e);
        e.currentTarget.form?.requestSubmit();
      }}
    />
  );
}

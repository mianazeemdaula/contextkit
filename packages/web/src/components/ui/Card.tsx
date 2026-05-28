import type { HTMLAttributes, ReactNode } from "react";

type Props = HTMLAttributes<HTMLDivElement> & { children: ReactNode };

/** Rounded white card with light shadow. */
export function Card({ className = "", children, ...rest }: Props) {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white p-6 shadow-sm ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

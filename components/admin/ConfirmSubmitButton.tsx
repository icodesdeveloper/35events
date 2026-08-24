"use client";

import type { MouseEvent, ReactNode } from "react";
import { useConfirm } from "@/components/admin/ConfirmDialogProvider";

export default function ConfirmSubmitButton({
  confirmMessage,
  className,
  ariaLabel,
  children,
  name,
  value,
  danger = true,
}: {
  confirmMessage: string;
  className?: string;
  ariaLabel?: string;
  children: ReactNode;
  name?: string;
  value?: string;
  danger?: boolean;
}) {
  const confirm = useConfirm();

  async function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    const button = event.currentTarget;
    const confirmed = await confirm({ message: confirmMessage, danger });
    if (confirmed) button.form?.requestSubmit(button);
  }

  return (
    <button
      type="submit"
      name={name}
      value={value}
      aria-label={ariaLabel}
      className={className}
      onClick={handleClick}
    >
      {children}
    </button>
  );
}

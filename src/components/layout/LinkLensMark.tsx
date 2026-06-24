export function LinkLensMark({ className = "" }: { className?: string }) {
  return (
    <span
      className={
        "grid size-6 place-items-center rounded-md bg-brand text-brand-foreground " + className
      }
      aria-hidden
    >
      <span className="block size-2 rounded-full bg-background" />
    </span>
  );
}

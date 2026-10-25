/** Button classes (DESIGN.md: Buttons), shared by server and client components. */
export const BTN = "inline-flex items-center gap-2 rounded-pill px-5 py-3 text-[15px] font-semibold transition-[transform,background-color,box-shadow] duration-120 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-disabled disabled:text-muted disabled:shadow-none";
export const PRIMARY = `${BTN} bg-jam text-white hover:bg-jam-deep`;
export const GHOST = `${BTN} bg-white text-ink shadow-[inset_0_0_0_1px_var(--color-rule)] hover:shadow-[inset_0_0_0_1px_var(--color-ink)]`;
export const GHOST_SM = "inline-flex items-center rounded-pill bg-white px-3 py-1.5 text-[13px] font-semibold text-ink shadow-[inset_0_0_0_1px_var(--color-rule)] transition-[transform,box-shadow] duration-120 ease-out hover:shadow-[inset_0_0_0_1px_var(--color-ink)] active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-disabled disabled:text-muted disabled:shadow-none";

"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { formatUSD } from "@/lib/money";
import type { Claim, Commitment } from "@/lib/store";
import { api, errorText } from "./api";

export const BTN = "inline-flex items-center gap-2 rounded-pill px-5 py-3 text-[15px] font-semibold transition-[transform,background-color,box-shadow] duration-120 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-disabled disabled:text-muted disabled:shadow-none";
export const PRIMARY = `${BTN} bg-jam text-white hover:bg-jam-deep`;
export const GHOST = `${BTN} bg-white text-ink shadow-[inset_0_0_0_1px_var(--color-rule)] hover:shadow-[inset_0_0_0_1px_var(--color-ink)]`;
const FIELD = "rounded-field border border-field bg-white px-3.5 py-[11px] text-base font-medium text-ink outline-none focus:border-berry focus:shadow-[0_0_0_3px_rgba(224,20,111,0.18)] aria-invalid:border-jam";

const KINDS: [Claim["kind"], string][] = [["damaged", "Damaged cartons"], ["missing", "Missing cartons"], ["short", "Short delivery"]];
const MAX_PHOTO = 5 * 1024 * 1024;

type Props = { roundId: string; mine: Commitment; onFiled: () => void; onCancel: () => void };

/** Report a delivery problem; the agent proposes a fix the supplier approves. */
export default function ClaimForm({ roundId, mine, onFiled, onCancel }: Props) {
  const [kind, setKind] = useState<Claim["kind"]>("damaged");
  const [cartons, setCartons] = useState("");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<string>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const id = useId();
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => title.current?.focus(), []); // the opener button unmounts; keep keyboard focus in the form

  function pickPhoto(file: File | undefined) {
    setPhoto(undefined);
    setError("");
    if (!file) return;
    if (!/^image\/(jpeg|png)$/.test(file.type)) return setError("The photo must be a JPEG or PNG.");
    if (file.size > MAX_PHOTO) return setError("The photo is over 5 MB. Choose a smaller one.");
    const r = new FileReader();
    r.onload = () => setPhoto(r.result as string);
    r.readAsDataURL(file);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const n = Number(cartons);
    if (!Number.isInteger(n) || n < 1 || n > mine.qty) return setError(`Enter a number of cartons from 1 to ${mine.qty}.`);
    setBusy(true);
    setError("");
    try {
      await api(`/api/rounds/${roundId}/claims`, { commitmentId: mine.id, kind, cartons: n, note, ...(photo && { photo }) });
      onFiled();
    } catch (err) {
      setError(`${errorText(err)}. Your report wasn't sent; try again.`);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} aria-labelledby={`${id}-t`} aria-busy={busy} className="grid gap-4 rounded-lg bg-white p-6 shadow-lift max-[900px]:p-5">
      <h2 id={`${id}-t`} ref={title} tabIndex={-1} className="font-display text-lg font-bold tracking-[-0.01em]">
        Report a problem
      </h2>
      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-sm">What went wrong?</legend>
        {KINDS.map(([k, label]) => (
          <label key={k} className="flex items-center gap-2.5 text-[15px]">
            <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="size-4 accent-berry" />
            {label}
          </label>
        ))}
      </fieldset>
      <label className="grid gap-1.5 text-sm">
        Cartons affected
        <input
          inputMode="numeric"
          value={cartons}
          onChange={(e) => setCartons(e.target.value.replace(/\D/g, ""))}
          aria-describedby={`${id}-c`}
          className={`${FIELD} max-w-40 tabular-nums`}
        />
        <span id={`${id}-c`} className="text-[13px] text-muted">
          Out of the {mine.qty} you ordered
        </span>
      </label>
      <label className="grid gap-1.5 text-sm">
        What happened (optional)
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000} className={FIELD} />
      </label>
      <label className="grid gap-1.5 text-sm">
        Photo (optional, JPEG or PNG up to 5 MB)
        <input
          type="file"
          accept="image/jpeg,image/png"
          onChange={(e) => pickPhoto(e.target.files?.[0])}
          className="text-sm file:mr-3 file:rounded-pill file:border-0 file:bg-tint file:px-4 file:py-2 file:font-semibold file:text-ink"
        />
      </label>
      {error && (
        <p role="alert" className="text-[13px] text-jam">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2.5">
        <button type="submit" disabled={busy} className={PRIMARY}>
          {busy && <span aria-hidden="true" className="size-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
          {busy ? "Checking your report" : "Send report"}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className={GHOST}>
          Cancel
        </button>
      </div>
      {busy && <p className="text-[13px] text-muted">The agent checks your report against tracking and the round&apos;s rules. This can take up to a minute.</p>}
    </form>
  );
}

export const KIND_WORD: Record<Claim["kind"], string> = { damaged: "damaged", missing: "missing", short: "short" };

/** A filed claim as the shop sees it: what it reported, the proposed refund and where it stands. Approval happens on the supplier console. */
export function ClaimStatus({ claim, mine, supplier }: { claim: Claim; mine: Commitment; supplier: string }) {
  const p = claim.proposal;
  return (
    <div className="grid gap-3">
      <p className="font-display text-lg font-bold tracking-[-0.01em]">
        {claim.cartons} {claim.cartons === 1 ? "carton" : "cartons"} {KIND_WORD[claim.kind]}
      </p>
      {claim.note && <p className="text-sm text-muted">You wrote: &ldquo;{claim.note}&rdquo;</p>}
      {p && (
        <p className="border-t border-rule pt-3 text-sm tabular-nums">
          {/* R13: the agent's reason is written for the approver; the shop sees only the proposed amount. */}
          {p.refund > 0 ? (
            <>
              Proposed refund: <b>{formatUSD(p.refund)}</b>, paid from {supplier}&apos;s holdback. Other shops are unaffected.
            </>
          ) : (
            "No refund proposed."
          )}
        </p>
      )}
      <p className="text-sm text-muted">
        {claim.status === "open"
          ? `Waiting for ${supplier} to approve. Nothing has been refunded yet.`
          : claim.status === "approved"
            ? mine.refunded > 0 ? `Approved by ${supplier}. ${formatUSD(mine.refunded)} refunded to your PayPal.` : `Approved by ${supplier}, with no refund.`
            : `${supplier} declined this claim. You can report the problem again with more detail.`}
      </p>
    </div>
  );
}

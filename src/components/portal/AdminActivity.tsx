import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/portal/ConfirmDialog";
import { listAdminUnlockRequests, decideUnlockRequest, listRecentSubmissions } from "@/lib/portal.functions";
import { formatDateTimePt, monthLabel } from "@/lib/portal";

type UnlockRow = {
  id: string;
  full_name: string;
  nif: string;
  year: number;
  month: number;
  reason: string;
  status: "pendente" | "aprovado" | "rejeitado" | "fechado";
  decided_at?: string | null;
  created_at: string;
};

export function UnlockRequests({ history = false }: { history?: boolean }) {
  const fetchRequests = useServerFn(listAdminUnlockRequests);
  const [filter, setFilter] = useState<"todos" | UnlockRow["status"]>("todos");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const decide = useServerFn(decideUnlockRequest);
  const [rows, setRows] = useState<UnlockRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setRows((await fetchRequests()) as unknown as UnlockRow[]);
    } catch {
      setError("Não foi possível carregar os pedidos. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [fetchRequests]);

  useEffect(() => {
    void load();
  }, [load]);

  const [pendingDecision, setPendingDecision] = useState<{
    id: string;
    decision: "aprovado" | "rejeitado" | "fechado";
  } | null>(null);
  const [note, setNote] = useState("");

  async function act(id: string, decision: "aprovado" | "rejeitado" | "fechado") {
    setNote("");
    setPendingDecision({ id, decision });
  }

  async function doAct() {
    const pending = pendingDecision;
    if (!pending) return;
    setBusyId(pending.id);
    try {
      const trimmed = note.trim();
      await decide({
        data: {
          id: pending.id,
          decision: pending.decision,
          ...(trimmed ? { note: trimmed } : {}),
        },
      });
      setPendingDecision(null);
      await load();
    } catch {
      setError("Não foi possível atualizar o pedido. Tente novamente.");
    } finally {
      setBusyId(null);
    }
  }

  const visibleRows = rows.filter((r) => history ? filter === "todos" || r.status === filter : r.status === "pendente");

  if (!history && !loading && visibleRows.length === 0) return null;

  return (
    <section id="desbloqueios" className="mb-10 scroll-mt-24">
      <h2 className="mb-4 font-serif text-2xl text-foreground">{history ? "Pedidos e histórico" : "Pedidos de desbloqueio pendentes"}</h2>
      {history ? <div className="mb-5 flex flex-wrap gap-2">
        {(["todos", "pendente", "aprovado", "rejeitado", "fechado"] as const).map((value) => (
          <Button key={value} variant={filter === value ? "default" : "outline"} size="sm" className="rounded-full" onClick={() => setFilter(value)}>
            {{ todos: "Todos", pendente: "Pendentes", aprovado: "Aprovados", rejeitado: "Rejeitados", fechado: "Fechados" }[value]}
          </Button>
        ))}
      </div> : null}
      {error ? <p role="alert" className="mb-4 text-sm text-destructive">{error}</p> : null}
      {loading ? <p className="py-8 text-sm text-muted-foreground">A carregar pedidos…</p> : visibleRows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gold/30 px-6 py-8 text-center text-sm text-muted-foreground">
          {history ? "Não existem pedidos neste estado." : "Não existem pedidos de desbloqueio pendentes."}
        </p>
      ) : (
      <div className="space-y-3">
        {visibleRows.map((r) => (
          <div key={r.id} className="soft-card p-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-serif text-lg text-foreground">{r.full_name}</span>
              <span className="text-xs text-muted-foreground">NIF {r.nif}</span>
              <span className="rounded-full bg-gold/15 px-3 py-1 text-xs text-gold">
                {monthLabel(r.month)} {r.year}
              </span>
              <span className="text-xs text-muted-foreground">
                {{ pendente: "Pendente", aprovado: "Aprovado", rejeitado: "Rejeitado", fechado: "Fechado" }[r.status]} ·{" "}
                {formatDateTimePt(r.created_at)}
              </span>
            </div>
            <p className="mt-3 break-words text-sm text-foreground/80">{r.reason}</p>
            {history && r.decided_at ? <p className="mt-2 text-xs text-muted-foreground">Decisão em {formatDateTimePt(r.decided_at)}</p> : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {r.status === "pendente" ? (
                <>
                  <Button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => void act(r.id, "aprovado")}
                    className="rounded-full bg-gold px-5 py-2.5 text-xs font-medium text-ink transition-colors hover:bg-gold-deep disabled:opacity-60"
                  >
                    Aprovar
                  </Button>
                  <Button
                    variant="outline"
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => void act(r.id, "rejeitado")}
                    className="rounded-full border border-ink/15 px-5 py-2.5 text-xs text-foreground transition-colors hover:border-destructive hover:text-destructive disabled:opacity-60"
                  >
                    Rejeitar
                  </Button>
                </>
              ) : r.status === "aprovado" ? (
                <Button
                  variant="outline"
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => void act(r.id, "fechado")}
                  className="rounded-full border border-ink/15 px-5 py-2.5 text-xs text-foreground transition-colors hover:border-gold hover:text-gold disabled:opacity-60"
                >
                  Voltar a bloquear
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      )}

      <ConfirmDialog
        open={pendingDecision !== null}
        busy={busyId !== null}
        destructive={pendingDecision?.decision === "rejeitado"}
        icon={<CheckCircle2 className="h-6 w-6" />}
        title={
          pendingDecision?.decision === "aprovado"
            ? "Aprovar pedido?"
            : pendingDecision?.decision === "rejeitado"
              ? "Rejeitar pedido?"
              : "Voltar a bloquear mês?"
        }
        message={
          pendingDecision?.decision === "aprovado"
            ? "Tem a certeza que pretende aprovar este pedido? O mês ficará desbloqueado para o cliente."
            : pendingDecision?.decision === "rejeitado"
              ? "Tem a certeza que pretende rejeitar este pedido?"
              : "Tem a certeza que pretende voltar a bloquear este mês?"
        }
        confirmLabel={
          pendingDecision?.decision === "aprovado"
            ? "Aprovar"
            : pendingDecision?.decision === "rejeitado"
              ? "Rejeitar"
              : "Bloquear"
        }
        onConfirm={() => void doAct()}
        onCancel={() => setPendingDecision(null)}
      />
    </section>
  );
}

type SubmissionRow = {
  id: string;
  full_name: string;
  nif: string;
  year: number;
  month: number;
  submitted_at: string;
  document_count: number;
};

export function RecentSubmissions() {
  const fetchRecent = useServerFn(listRecentSubmissions);
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [all, setAll] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        setRows((await fetchRecent()) as unknown as SubmissionRow[]);
      } catch {
        /* ignore */
      }
    })();
  }, [fetchRecent]);

  return (
    <section id="submissoes" className="mt-10 scroll-mt-24">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="font-serif text-2xl text-foreground">Submissões Recentes</h2>
        {rows.length > 5 ? (
          <Button
            variant="ghost"
            type="button"
            onClick={() => setAll((v) => !v)}
            className="text-xs text-gold hover:underline"
          >
            {all ? "Ver menos" : "Ver todas"}
          </Button>
        ) : null}
      </div>
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gold/30 px-6 py-8 text-center text-sm text-muted-foreground">
          Ainda não existem submissões de documentação.
        </p>
      ) : (
        <div className="space-y-3">
          {(all ? rows : rows.slice(0, 5)).map((r) => (
            <div key={r.id} className="soft-card flex flex-wrap items-center gap-4 px-5 py-4">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gold/15 text-gold">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-serif text-lg text-foreground">
                  {r.full_name} · {monthLabel(r.month)} {r.year}
                </p>
                <p className="text-xs text-muted-foreground">
                  NIF {r.nif} · {r.document_count} documento(s) · submetida em{" "}
                  {formatDateTimePt(r.submitted_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Archive,
  ArchiveRestore,
  ArrowUpRight,
  BarChart3,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  QrCode,
  Search,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { createLink, deleteLink, listLinks, updateLink } from "@/lib/links.functions";
import { formatNumber, formatRelative, shortDomain } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · LinkLens" }] }),
  component: Dashboard,
});

type LinkRow = {
  id: string;
  short_code: string;
  original_url: string;
  title: string | null;
  click_count: number;
  is_archived: boolean;
  created_at: string;
};

function shortBase() {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/r`;
}

function Dashboard() {
  const queryClient = useQueryClient();
  const getLinks = useServerFn(listLinks);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const linksQuery = useQuery({
    queryKey: ["links"],
    queryFn: async () => (await getLinks()) as LinkRow[],
    retry: 1,
  });

  const stats = useMemo(() => {
    const links = linksQuery.data ?? [];
    const active = links.filter((l) => !l.is_archived);
    const totalClicks = links.reduce((sum, l) => sum + (l.click_count ?? 0), 0);
    const top = [...active].sort((a, b) => b.click_count - a.click_count)[0] ?? null;
    return {
      totalLinks: active.length,
      totalClicks,
      topClicks: top?.click_count ?? 0,
      topCode: top?.short_code ?? null,
    };
  }, [linksQuery.data]);

  const filtered = useMemo(() => {
    const links = linksQuery.data ?? [];
    return links
      .filter((l) => l.is_archived === showArchived)
      .filter((l) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          l.short_code.toLowerCase().includes(q) ||
          l.original_url.toLowerCase().includes(q) ||
          (l.title ?? "").toLowerCase().includes(q)
        );
      });
  }, [linksQuery.data, search, showArchived]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Create short links, share them anywhere, and measure who clicks.
        </p>
      </header>

      <CreateLinkCard
        onCreated={() => queryClient.invalidateQueries({ queryKey: ["links"] })}
      />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Active links" value={formatNumber(stats.totalLinks)} hint="In your account" />
        <Kpi label="Total clicks" value={formatNumber(stats.totalClicks)} hint="All time" />
        <Kpi
          label="Top performer"
          value={stats.topCode ? `/${stats.topCode}` : "—"}
          hint={stats.topClicks ? `${formatNumber(stats.topClicks)} clicks` : "No clicks yet"}
        />
        <Kpi
          label="Archived"
          value={formatNumber((linksQuery.data ?? []).filter((l) => l.is_archived).length)}
          hint="Kept for reference"
        />
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {showArchived ? "Archived links" : "Your links"}
          </h2>
          <div className="flex gap-2">
            <div className="relative flex-1 sm:w-72 sm:flex-none">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search short code, URL, title…"
                className="pl-8"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowArchived((v) => !v)}
            >
              {showArchived ? "Active" : "Archived"}
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card/40">
          {linksQuery.isLoading ? (
            <div className="space-y-px">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex animate-pulse items-center justify-between border-b border-border p-4 last:border-b-0">
                  <div className="space-y-2">
                    <div className="h-3 w-40 rounded bg-muted" />
                    <div className="h-2 w-64 rounded bg-muted" />
                  </div>
                  <div className="h-8 w-16 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState archived={showArchived} />
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((link) => (
                <LinkRow key={link.id} link={link} />
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-mono text-xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function EmptyState({ archived }: { archived: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="grid size-10 place-items-center rounded-full bg-muted ring-1 ring-border">
        <BarChart3 className="size-5 text-muted-foreground" />
      </div>
      <p className="mt-4 text-sm font-medium">
        {archived ? "No archived links" : "No links yet"}
      </p>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">
        {archived
          ? "Links you archive show up here for reference."
          : "Create your first short link using the form above."}
      </p>
    </div>
  );
}

function CreateLinkCard({ onCreated }: { onCreated: () => void }) {
  const create = useServerFn(createLink);
  const [url, setUrl] = useState("");
  const [alias, setAlias] = useState("");
  const mutation = useMutation({
    mutationFn: () => create({ data: { url, alias: alias || null } }),
    onSuccess: () => {
      toast.success("Link created");
      setUrl("");
      setAlias("");
      onCreated();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to create"),
  });

  return (
    <section className="rounded-xl border border-border bg-card/40 p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!url.trim()) return;
          mutation.mutate();
        }}
        className="flex flex-col gap-3 md:flex-row"
      >
        <div className="flex flex-1 items-center rounded-lg bg-background ring-1 ring-border focus-within:ring-brand/50 transition-shadow">
          <span className="border-r border-border pl-3 pr-2 font-mono text-[11px] text-muted-foreground">
            HTTPS://
          </span>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a long URL to shorten…"
            className="border-0 bg-transparent shadow-none focus-visible:ring-0"
            aria-label="Long URL"
          />
        </div>
        <div className="flex items-center rounded-lg bg-background ring-1 ring-border md:w-56">
          <span className="pl-3 pr-1 font-mono text-[11px] text-muted-foreground">/r/</span>
          <Input
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            placeholder="custom-alias"
            className="border-0 bg-transparent shadow-none focus-visible:ring-0"
            aria-label="Custom alias (optional)"
          />
        </div>
        <Button
          type="submit"
          disabled={mutation.isPending || !url.trim()}
          className="bg-brand text-brand-foreground hover:brightness-110"
        >
          {mutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              <span className="text-base leading-none">+</span>
              Create link
            </>
          )}
        </Button>
      </form>
    </section>
  );
}

function LinkRow({ link }: { link: LinkRow }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const del = useServerFn(deleteLink);
  const update = useServerFn(updateLink);
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fullUrl = `${shortBase()}/${link.short_code}`;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy");
    }
  };

  const openQr = async () => {
    setQrOpen(true);
    setQrData(null);
    try {
      // Browser-only import: the PNG encoder used by this package is not safe to
      // evaluate in the server refresh path, so never import it at route scope.
      const { default: QRCode } = await import("qrcode");
      const dataUrl = await QRCode.toDataURL(fullUrl, {
        width: 512,
        margin: 1,
        color: { dark: "#0a0a0a", light: "#ffffff" },
      });
      setQrData(dataUrl);
    } catch {
      toast.error("Could not generate QR code");
      setQrOpen(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: () => del({ data: { id: link.id } }),
    onSuccess: () => {
      toast.success("Link deleted");
      queryClient.invalidateQueries({ queryKey: ["links"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to delete"),
  });

  const archiveMutation = useMutation({
    mutationFn: () => update({ data: { id: link.id, is_archived: !link.is_archived } }),
    onSuccess: () => {
      toast.success(link.is_archived ? "Restored" : "Archived");
      queryClient.invalidateQueries({ queryKey: ["links"] });
    },
  });

  return (
    <li className="group flex items-center justify-between gap-3 p-4 transition-colors hover:bg-muted/40">
      <button
        onClick={() => router.navigate({ to: "/links/$id", params: { id: link.id } })}
        className="min-w-0 flex-1 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-medium text-brand">/r/{link.short_code}</span>
          <ArrowUpRight className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="truncate">{shortDomain(link.original_url)} · {link.original_url}</span>
        </div>
        <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">
          {formatRelative(link.created_at)}
        </p>
      </button>
      <div className="flex shrink-0 items-center gap-3">
        <div className="hidden text-right md:block">
          <p className="font-mono text-sm font-semibold">{formatNumber(link.click_count)}</p>
          <p className="text-[10px] uppercase tracking-tighter text-muted-foreground">clicks</p>
        </div>
        <div className="flex gap-1">
          <IconButton label="Copy short URL" onClick={onCopy}>
            {copied ? <Check className="size-4 text-brand" /> : <Copy className="size-4" />}
          </IconButton>
          <IconButton label="Show QR code" onClick={openQr}>
            <QrCode className="size-4" />
          </IconButton>
          <IconButton label="Open destination" onClick={() => window.open(link.original_url, "_blank", "noopener")}>
            <ExternalLink className="size-4" />
          </IconButton>
          <IconButton
            label={link.is_archived ? "Restore link" : "Archive link"}
            onClick={() => archiveMutation.mutate()}
          >
            {link.is_archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
          </IconButton>
          <IconButton label="Delete link" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="size-4 text-destructive" />
          </IconButton>
        </div>
      </div>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>QR code for /r/{link.short_code}</DialogTitle>
            <DialogDescription>
              Scan to open {shortDomain(link.original_url)}. Right-click the image to download.
            </DialogDescription>
          </DialogHeader>
          <div className="grid place-items-center p-2">
            {qrData ? (
              <img src={qrData} alt="QR code" className="size-64 rounded-lg" />
            ) : (
              <div className="grid size-64 place-items-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
            <span className="truncate font-mono text-xs">{fullUrl}</span>
            <Button size="sm" variant="ghost" onClick={onCopy}>
              {copied ? <Check className="size-4 text-brand" /> : <Copy className="size-4" />}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this link?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes /r/{link.short_code} and all of its analytics events.
              Visitors who click it after this will see a not-found page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:brightness-110"
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}

function IconButton({
  label,
  children,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      title={label}
      className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}
// Re-export to keep import groups stable for editors that reorder.
export { Label };

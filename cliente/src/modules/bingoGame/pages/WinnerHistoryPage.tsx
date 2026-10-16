import React, { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import { Workbook } from "exceljs";
import { saveAs } from "file-saver";
import { jsPDF } from "jspdf";
import AppButton from "../../../shared/components/Buttons/AppButton";
import AppIcon from "../../../shared/components/AppIcon";
import AppModal from "../../../shared/components/AppModal";
import { listWinnerHistory, WinnerHistoryItem, WinnerMethod } from "../services/winnerHistory.service";

const PER_PAGE = 20;
type MethodFilter = "ALL" | WinnerMethod;

const methodLabel = (method: WinnerMethod) => method === "RULETA" ? "Ganó por ruleta" : method === "MAQUINA_SUERTE" ? "Ganó en la Máquina de la Suerte" : "Ganó por bingo";
const dateTime = (value: string) => new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const dateOnly = (value: string) => new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(new Date(value));
const plainLabel = (value: string | null) => value ? value.replace(/_/g, " ").toLowerCase().replace(/^./, (letter: string) => letter.toUpperCase()) : "—";
const todayLocal = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const EXPORT_LIMIT = 20000;

const WinnerHistoryPage: React.FC = () => {
  const [rows, setRows] = useState<WinnerHistoryItem[]>([]);
  const [summary, setSummary] = useState({ total: 0, bingoAwards: 0, bingo: 0, roulette: 0, slotMachine: 0, withRegistration: 0 });
  const [dailySummary, setDailySummary] = useState<Array<{ day: string; total: number; bingoAwards: number; bingo: number; roulette: number; slotMachine: number }>>([]);
  const [total, setTotal] = useState(0);
  const [method, setMethod] = useState<MethodFilter>("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState(todayLocal);
  const [dateTo, setDateTo] = useState(todayLocal);
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<WinnerHistoryItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState<"excel" | "pdf" | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await listWinnerHistory({ method, search, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, page, perPage: PER_PAGE });
      setRows(result.data);
      setTotal(result.total);
      setSummary(result.summary);
      setDailySummary(result.dailySummary);
    } catch {
      toast.error("No fue posible cargar el historial de ganadores.");
    } finally { setIsLoading(false); }
  }, [method, search, dateFrom, dateTo, page]);

  useEffect(() => { load(); }, [load]);
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const periodLabel = dateFrom && dateTo
    ? dateFrom === dateTo ? `Día ${dateFrom}` : `${dateFrom} a ${dateTo}`
    : dateFrom ? `Desde ${dateFrom}` : dateTo ? `Hasta ${dateTo}` : "Todo el historial";

  const exportRows = async () => (await listWinnerHistory({
    method,
    search,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page: 1,
    perPage: EXPORT_LIMIT,
  })).data;

  const handleExportExcel = async () => {
    setIsExporting("excel");
    try {
      const data = await exportRows();
      const workbook = new Workbook();
      const sheet = workbook.addWorksheet("Ganadores");
      sheet.addRow(["Fecha", "Cartón ganador", "Nombre", "Identificación", "Municipio"]);
      data.forEach((row) => sheet.addRow([
        dateOnly(row.wonAt),
        row.cardNumber,
        row.nombreCompleto ?? "Sin registro",
        row.numeroIdentificacion ? `${row.tipoIdentificacion ?? ""} ${row.numeroIdentificacion}`.trim() : "",
        row.municipioLabel ?? "",
      ]));
      sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF6244C5" } };
      sheet.views = [{ state: "frozen", ySplit: 1 }];
      sheet.columns = [{ width: 18 }, { width: 18 }, { width: 34 }, { width: 24 }, { width: 24 }];
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `ganadores-${dateFrom || "inicio"}-${dateTo || "hoy"}.xlsx`);
      toast.success(`${data.length.toLocaleString("es-CO")} premios exportados a Excel.`);
    } catch { toast.error("No fue posible exportar el historial a Excel."); }
    finally { setIsExporting(null); }
  };

  const handleExportPdf = async () => {
    setIsExporting("pdf");
    try {
      const data = await exportRows();
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const columns = [
        { label: "Fecha", x: 12, w: 42 },
        { label: "Cartón ganador", x: 54, w: 30 },
        { label: "Nombre", x: 84, w: 82 },
        { label: "Identificación", x: 166, w: 55 },
        { label: "Municipio", x: 221, w: 52 },
      ];
      const drawHeader = (continuation = false) => {
        doc.setFillColor(52, 29, 104); doc.rect(0, 0, pageW, 26, "F");
        doc.setTextColor(255, 244, 174); doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.text("HISTORIAL DE GANADORES ASODIFI", 12, 13);
        doc.setTextColor(220, 213, 239); doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text(`${periodLabel}${continuation ? " · continuación" : ""}`, 12, 21);
        doc.setFillColor(99, 68, 197); doc.rect(10, 30, pageW - 20, 9, "F");
        doc.setTextColor(255, 255, 255); doc.setFontSize(7); columns.forEach((column) => doc.text(column.label, column.x + 1, 36));
      };
      drawHeader();
      let y = 45;
      data.forEach((row) => {
        if (y > pageH - 12) { doc.addPage(); drawHeader(true); y = 45; }
        if (Math.floor((y - 45) / 9) % 2 === 0) { doc.setFillColor(248, 247, 252); doc.rect(10, y - 4.8, pageW - 20, 8.5, "F"); }
        doc.setTextColor(54, 49, 63); doc.setFont("helvetica", "normal"); doc.setFontSize(6.6);
        const identification = row.numeroIdentificacion ? `${row.tipoIdentificacion ?? ""} ${row.numeroIdentificacion}`.trim() : "—";
        const values = [dateOnly(row.wonAt), `#${row.cardNumber}`, row.nombreCompleto ?? "Sin registro", identification, row.municipioLabel ?? "—"];
        columns.forEach((column, index) => { const text = doc.splitTextToSize(values[index], column.w - 3)[0]; doc.text(text, column.x + 1, y); });
        y += 9;
      });
      doc.setFontSize(7); doc.setTextColor(120, 114, 132); doc.text(`Generado el ${dateTime(new Date().toISOString())} · ${data.length} registros`, 12, pageH - 5);
      doc.save(`ganadores-${dateFrom || "inicio"}-${dateTo || "hoy"}.pdf`);
      toast.success(`${data.length.toLocaleString("es-CO")} premios exportados a PDF.`);
    } catch { toast.error("No fue posible exportar el historial a PDF."); }
    finally { setIsExporting(null); }
  };

  return (
    <WinnerHistoryStyle>
      <header className="module-head">
        <div>
          <span className="eyebrow">Juego · Resultados oficiales</span>
          <h1 className="page-heading">Historial de ganadores</h1>
          <p className="page-caption">Consulta quién ganó, la figura completada y si el resultado fue directo o definido mediante ruleta.</p>
        </div>
        <div className="head-actions">
          <AppButton icon="receipt" variant="light" label={isExporting === "excel" ? "Exportando…" : "Exportar Excel"} onClick={handleExportExcel} disabled={Boolean(isExporting) || isLoading || summary.total === 0} />
          <AppButton icon="receipt" label={isExporting === "pdf" ? "Exportando…" : "Exportar PDF"} onClick={handleExportPdf} disabled={Boolean(isExporting) || isLoading || summary.total === 0} />
        </div>
      </header>

      <section className="summary-grid">
        <article className="summary-card total"><span><AppIcon icon="trophy" /></span><div><small>Total de premios</small><strong>{summary.total.toLocaleString("es-CO")}</strong><em>{periodLabel}</em></div></article>
        <article className="summary-card bingo-awards"><span><AppIcon icon="certificate" /></span><div><small>Premios de bingo</small><strong>{summary.bingoAwards.toLocaleString("es-CO")}</strong><em>Directos y desempates</em></div></article>
        <article className="summary-card bingo"><span><AppIcon icon="trophy" /></span><div><small>Bingo directo</small><strong>{summary.bingo.toLocaleString("es-CO")}</strong><em>Sin desempate</em></div></article>
        <article className="summary-card roulette"><span><AppIcon icon="rotate" /></span><div><small>Ganadores por ruleta</small><strong>{summary.roulette.toLocaleString("es-CO")}</strong><em>Desempates resueltos</em></div></article>
        <article className="summary-card slot"><span><AppIcon icon="gem" /></span><div><small>Máquina de la suerte</small><strong>{summary.slotMachine.toLocaleString("es-CO")}</strong><em>Sorteos especiales</em></div></article>
      </section>

      <section className="filters surface-card">
        <div className="method-tabs">
          {(["ALL", "BINGO", "RULETA", "MAQUINA_SUERTE"] as MethodFilter[]).map((item) => (
            <button type="button" key={item} className={method === item ? "active" : ""} onClick={() => { setMethod(item); setPage(1); }}>
              {item === "ALL" ? "Todos" : item === "BINGO" ? "Bingo directo" : item === "RULETA" ? "Por ruleta" : "Máquina"}
            </button>
          ))}
        </div>
        <div className="date-filter">
          <label><span>Desde</span><input type="date" className="form-input" value={dateFrom} max={dateTo || undefined} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} /></label>
          <span className="date-arrow">→</span>
          <label><span>Hasta</span><input type="date" className="form-input" value={dateTo} min={dateFrom || undefined} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} /></label>
          <button type="button" className="date-shortcut" onClick={() => { const today = todayLocal(); setDateFrom(today); setDateTo(today); setPage(1); }}>Hoy</button>
          <button type="button" className="date-shortcut" onClick={() => { setDateFrom(""); setDateTo(""); setPage(1); }}>Todo</button>
        </div>
        <label className="search-field"><AppIcon icon="search" /><input className="form-input" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Buscar cartón, ganador o identificación…" /></label>
        {(method !== "ALL" || search) && <AppButton variant="transparent" icon="times" label="Limpiar" onClick={() => { setMethod("ALL"); setSearchInput(""); setSearch(""); setPage(1); }} />}
      </section>

      <section className="daily-ledger surface-card">
        <header><div><span>Cierre diario de premios</span><small>Consolidado oficial por fecha, independientemente del filtro por tipo.</small></div><em>{dailySummary.length} {dailySummary.length === 1 ? "día" : "días"}</em></header>
        {dailySummary.length > 0 ? <div className="daily-scroll"><table><thead><tr><th>Fecha</th><th>Total entregados</th><th>Premios de bingo</th><th>Directos</th><th>Por ruleta</th><th>Máquina de la suerte</th></tr></thead><tbody>{dailySummary.map((day) => <tr key={day.day}><td><strong>{new Intl.DateTimeFormat("es-CO", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${day.day}T00:00:00Z`))}</strong></td><td><b>{day.total}</b></td><td>{day.bingoAwards}</td><td>{day.bingo}</td><td>{day.roulette}</td><td><span>{day.slotMachine}</span></td></tr>)}</tbody></table></div> : <div className="daily-empty">No hay premios registrados en el periodo seleccionado.</div>}
      </section>

      <section className="history-card surface-card">
        <div className="table-title"><div><span>Registro cronológico</span><small>Los datos corresponden al momento exacto del resultado.</small></div><strong>{total.toLocaleString("es-CO")}</strong></div>
        {isLoading ? (
          <div className="state"><AppIcon icon="rotate" className="spin" />Cargando resultados…</div>
        ) : rows.length === 0 ? (
          <div className="state empty"><span><AppIcon icon="trophy" /></span><strong>Aún no hay ganadores</strong><small>{method !== "ALL" || search ? "No hay resultados que coincidan con los filtros." : "El primer resultado aparecerá automáticamente al confirmarse un bingo."}</small></div>
        ) : (
          <>
            <div className="table-scroll">
              <table className="vs-dataTable">
                <thead><tr><th>Resultado</th><th>Cartón</th><th>Ganador</th><th>Figura completada</th><th>Datos destacados</th><th>Fecha y hora</th><th /></tr></thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td><span className={`method-badge ${row.method.toLowerCase()}`}><AppIcon icon={row.method === "MAQUINA_SUERTE" ? "gem" : row.method === "RULETA" ? "rotate" : "trophy"} />{row.method === "MAQUINA_SUERTE" ? "Máquina" : row.method === "RULETA" ? "Ruleta" : "Bingo"}</span></td>
                      <td><span className="card-number">#{String(row.cardNumber).padStart(4, "0")}</span></td>
                      <td>{row.nombreCompleto ? <div className="person"><strong>{row.nombreCompleto}</strong><small>{row.tipoIdentificacion} {row.numeroIdentificacion}</small></div> : <span className="unregistered">Sin datos registrados</span>}</td>
                      <td><div className="figure-cell">{row.method === "MAQUINA_SUERTE" ? <span className="slot-mark"><AppIcon icon="gem" /></span> : <span className="mini-pattern">{Array.from({ length: 25 }, (_, index) => { const r = Math.floor(index / 5); const c = index % 5; return <i key={index} className={r === 2 && c === 2 ? "free" : row.figurePattern?.[r]?.[c] ? "active" : ""} />; })}</span>}<strong>{row.figureName ?? "Figura sin nombre"}</strong></div></td>
                      <td><div className="flags">{row.discapacidad === "SI" && <span>Discapacidad</span>}{row.cuidador === "SI" && <span>Cuidador</span>}{row.municipioLabel && <small>{row.municipioLabel}</small>}{!row.nombreCompleto && <small>—</small>}</div></td>
                      <td><time>{dateTime(row.wonAt)}</time></td>
                      <td><AppButton icon="search" variant="transparent" className="detail-button" onClick={() => setDetail(row)} ariaLabel={`Ver ganador del cartón ${row.cardNumber}`} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <footer className="table-foot"><span>Página {page} de {totalPages}</span><div><AppButton variant="transparent" icon="angle-double-left" onClick={() => setPage(1)} disabled={page === 1} ariaLabel="Primera página" /><AppButton variant="transparent" icon="angle-left" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} ariaLabel="Página anterior" /><AppButton variant="transparent" icon="angle-right" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages} ariaLabel="Página siguiente" /><AppButton variant="transparent" icon="angle-double-right" onClick={() => setPage(totalPages)} disabled={page >= totalPages} ariaLabel="Última página" /></div></footer>
          </>
        )}
      </section>

      <AppModal title="Detalle del resultado" size="md" isOpen={Boolean(detail)} onClose={() => setDetail(null)}>
        {detail && <div className="winner-detail">
          <div className={`detail-hero ${detail.method.toLowerCase()}`}><span className="hero-icon"><AppIcon icon={detail.method === "MAQUINA_SUERTE" ? "gem" : detail.method === "RULETA" ? "rotate" : "trophy"} /></span><div><small>{methodLabel(detail.method)}</small><strong>Cartón #{String(detail.cardNumber).padStart(4, "0")}</strong><em>{dateTime(detail.wonAt)}</em></div>{detail.method === "RULETA" && <span className="candidate-count">Entre {detail.rouletteCandidates} empatados</span>}</div>
          <div className="detail-columns">
            <section><h4>Resultado de la partida</h4><div className="figure-detail">{detail.method === "MAQUINA_SUERTE" ? <span className="large-slot-mark"><AppIcon icon="gem" /></span> : <span className="large-pattern">{Array.from({ length: 25 }, (_, index) => { const r = Math.floor(index / 5); const c = index % 5; return <i key={index} className={r === 2 && c === 2 ? "free" : detail.figurePattern?.[r]?.[c] ? "active" : ""}>{r === 2 && c === 2 ? "★" : ""}</i>; })}</span>}<div><small>{detail.method === "MAQUINA_SUERTE" ? "Origen del premio" : "Figura ganadora"}</small><strong>{detail.figureName ?? "Sin nombre"}</strong><em>{detail.method === "MAQUINA_SUERTE" ? `${detail.municipioLabel ?? "Municipio sin registro"} · cartón sorteado` : `${detail.winningBalls.length} balotas cantadas`}</em></div></div></section>
            <section><h4>Datos del ganador</h4><div className="data-grid">{[
              ["Nombre completo", detail.nombreCompleto], ["Identificación", detail.numeroIdentificacion ? `${detail.tipoIdentificacion} ${detail.numeroIdentificacion}` : null],
              ["Municipio", detail.municipioLabel], ["Contacto", detail.contacto], ["Sector", plainLabel(detail.sector)], ["Barrio / Vereda", detail.nombreResidencia],
              ["Discapacidad", detail.discapacidad === "SI" ? (detail.tipoDiscapacidadLabel ?? "Sí") : detail.discapacidad === "NO" ? "No" : null], ["Cuidador", detail.cuidador === "SI" ? "Sí" : detail.cuidador === "NO" ? "No" : null],
            ].map(([label, value]) => <div key={label as string}><small>{label}</small><strong>{value || "—"}</strong></div>)}</div></section>
          </div>
        </div>}
      </AppModal>
    </WinnerHistoryStyle>
  );
};

export default WinnerHistoryPage;

const WinnerHistoryStyle = styled.div`
  .module-head{display:flex;align-items:flex-start;justify-content:space-between;gap:1.5rem;margin-bottom:1.25rem}.eyebrow{color:var(--color-secondary);font-size:.62rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase}.page-heading{margin:.35rem 0 0;font-size:1.45rem}.page-caption{max-width:62ch;margin:.4rem 0 0;color:var(--text-muted);font-size:.72rem;line-height:1.55}.head-actions{display:flex;gap:.5rem}
  .summary-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:.65rem;margin-bottom:1rem}.summary-card{display:grid;grid-template-columns:38px 1fr;align-items:center;gap:.65rem;padding:.8rem;background:var(--bg-panel);border:1px solid var(--border-subtle);border-radius:14px}.summary-card>span{display:grid;width:38px;height:38px;place-items:center;color:#b9aaff;background:rgba(var(--color-primary-rgb),.1);border-radius:11px}.summary-card>div{display:flex;min-width:0;flex-direction:column}.summary-card small{color:var(--text-muted);font-size:.52rem;text-transform:uppercase}.summary-card strong{margin-top:.12rem;color:var(--text-primary);font-size:1.16rem}.summary-card em{overflow:hidden;color:var(--text-muted);font-size:.5rem;font-style:normal;text-overflow:ellipsis;white-space:nowrap}.summary-card.bingo-awards>span,.summary-card.bingo>span{color:#ffd567;background:rgba(255,195,67,.1)}.summary-card.roulette>span{color:#ff8fc5;background:rgba(255,87,168,.1)}.summary-card.slot>span{color:#63e4d0;background:rgba(65,218,196,.1)}
  .filters{display:flex;flex-wrap:wrap;align-items:center;gap:.65rem;margin-bottom:1rem;padding:.72rem .85rem}.method-tabs{display:flex;gap:.2rem;padding:.22rem;background:rgba(0,0,0,.2);border:1px solid var(--border-subtle);border-radius:11px}.method-tabs button{padding:.42rem .8rem;color:var(--text-muted);background:transparent;border:0;border-radius:8px;font-size:.66rem;font-weight:600;cursor:pointer}.method-tabs button.active{color:#fff;background:linear-gradient(135deg,#8a6bff,#6847f2)}.date-filter{display:flex;align-items:flex-end;gap:.35rem;padding:.35rem .45rem;background:rgba(0,0,0,.12);border:1px solid var(--border-subtle);border-radius:10px}.date-filter label{display:flex;flex-direction:column;gap:.18rem}.date-filter label span{color:var(--text-muted);font-size:.48rem;font-weight:700;text-transform:uppercase}.date-filter input{width:126px;padding:.35rem .45rem;font-size:.6rem}.date-arrow{align-self:center;color:var(--text-muted);font-size:.65rem}.date-shortcut{align-self:center;padding:.33rem .45rem;color:#b9aaff;background:rgba(var(--color-primary-rgb),.08);border:1px solid rgba(var(--color-primary-rgb),.18);border-radius:7px;font-size:.54rem;font-weight:700;cursor:pointer}.search-field{position:relative;display:flex;min-width:240px;flex:1;align-items:center}.search-field svg{position:absolute;left:.7rem;color:var(--text-muted);font-size:.68rem}.search-field input{padding-left:2rem}
  .daily-ledger{margin-bottom:1rem;padding:0;overflow:hidden}.daily-ledger>header{display:flex;align-items:center;justify-content:space-between;padding:.78rem 1rem;background:linear-gradient(90deg,rgba(var(--color-primary-rgb),.1),rgba(51,216,195,.045));border-bottom:1px solid var(--border-subtle)}.daily-ledger>header>div{display:flex;flex-direction:column}.daily-ledger>header span{font-size:.68rem;font-weight:700}.daily-ledger>header small{margin-top:.12rem;color:var(--text-muted);font-size:.54rem}.daily-ledger>header em{padding:.25rem .5rem;color:#73e7d7;background:rgba(58,216,196,.08);border:1px solid rgba(58,216,196,.2);border-radius:7px;font-size:.53rem;font-style:normal;font-weight:700}.daily-scroll{overflow-x:auto;padding:.35rem 1rem .65rem}.daily-ledger table{width:100%;border-collapse:collapse}.daily-ledger th{padding:.45rem .55rem;color:var(--text-muted);font-size:.5rem;text-align:left;text-transform:uppercase}.daily-ledger td{padding:.48rem .55rem;border-top:1px solid var(--border-subtle);color:var(--text-secondary);font-size:.62rem}.daily-ledger td strong{color:var(--text-primary);font-size:.62rem;text-transform:capitalize}.daily-ledger td b{color:#c2b5ff;font-size:.74rem}.daily-ledger td span{color:#72e9d8;font-weight:800}.daily-empty{padding:1rem;color:var(--text-muted);font-size:.62rem;text-align:center}
  .history-card{padding:0;overflow:hidden}.table-title{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.15rem;border-bottom:1px solid var(--border-subtle)}.table-title>div{display:flex;flex-direction:column}.table-title span{font-size:.72rem;font-weight:700}.table-title small{margin-top:.12rem;color:var(--text-muted);font-size:.57rem}.table-title>strong{color:#b9aaff;font-size:1rem}.table-scroll{overflow-x:auto;padding:0 1rem}.state{display:flex;align-items:center;justify-content:center;gap:.5rem;min-height:240px;color:var(--text-muted);font-size:.72rem}.state.empty{flex-direction:column}.state.empty>span{display:grid;width:56px;height:56px;place-items:center;color:#ffd468;background:rgba(255,196,70,.08);border:1px solid rgba(255,196,70,.2);border-radius:18px;font-size:1.1rem}.state.empty strong{color:var(--text-secondary);font-size:.78rem}.state.empty small{font-size:.62rem}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
  .method-badge{display:inline-flex;align-items:center;gap:.35rem;padding:.28rem .52rem;border:1px solid;border-radius:8px;font-size:.57rem;font-weight:700;white-space:nowrap}.method-badge.bingo{color:#ffd568;background:rgba(255,198,67,.08);border-color:rgba(255,198,67,.24)}.method-badge.ruleta{color:#ff9ccb;background:rgba(255,88,170,.08);border-color:rgba(255,88,170,.24)}.method-badge.maquina_suerte{color:#70ebda;background:rgba(65,218,196,.08);border-color:rgba(65,218,196,.24)}.card-number{color:#c0b4ff;font-size:.7rem;font-weight:800;white-space:nowrap}.person{display:flex;min-width:150px;flex-direction:column}.person strong{font-size:.7rem}.person small,.unregistered{margin-top:.12rem;color:var(--text-muted);font-size:.58rem}.unregistered{font-style:italic}.figure-cell{display:flex;min-width:135px;align-items:center;gap:.55rem}.figure-cell>strong{font-size:.62rem}.mini-pattern,.large-pattern{display:grid;grid-template-columns:repeat(5,1fr);gap:1.5px}.mini-pattern{width:31px;flex:0 0 31px}.mini-pattern i,.large-pattern i{aspect-ratio:1;background:#252c38;border-radius:1.5px}.mini-pattern i.active,.large-pattern i.active{background:#7c5cff}.mini-pattern i.free,.large-pattern i.free{background:#c99736}.slot-mark,.large-slot-mark{display:grid;place-items:center;color:#193e40;background:linear-gradient(145deg,#9cfff0,#3ad0c4);border-radius:9px}.slot-mark{width:31px;height:31px;flex:0 0 31px}.large-slot-mark{width:95px;height:95px;flex:0 0 95px;font-size:1.8rem}.flags{display:flex;min-width:110px;flex-wrap:wrap;gap:.22rem}.flags span{padding:.18rem .35rem;color:#ffd674;background:rgba(255,199,73,.08);border-radius:5px;font-size:.5rem;font-weight:700}.flags small{width:100%;color:var(--text-muted);font-size:.56rem}time{color:var(--text-secondary);font-size:.61rem;white-space:nowrap}.detail-button .vs-btn{width:30px;min-height:30px}.table-foot{display:flex;align-items:center;justify-content:space-between;padding:.8rem 1rem;border-top:1px solid var(--border-subtle);color:var(--text-muted);font-size:.62rem}.table-foot>div{display:flex;gap:.2rem}.table-foot .vs-btn{width:30px;min-height:30px}
  .winner-detail{display:flex;flex-direction:column;gap:1rem}.detail-hero{display:flex;align-items:center;gap:.8rem;padding:1rem;background:linear-gradient(120deg,rgba(255,197,65,.13),rgba(var(--color-primary-rgb),.08));border:1px solid rgba(255,202,75,.25);border-radius:15px}.detail-hero.ruleta{background:linear-gradient(120deg,rgba(255,83,168,.13),rgba(var(--color-primary-rgb),.1));border-color:rgba(255,95,177,.27)}.detail-hero.maquina_suerte{background:linear-gradient(120deg,rgba(63,218,196,.14),rgba(var(--color-primary-rgb),.08));border-color:rgba(63,218,196,.28)}.hero-icon{display:grid;width:48px;height:48px;place-items:center;color:#39203c;background:linear-gradient(145deg,#fff1a3,#ffbc43);border-radius:14px;font-size:1rem}.detail-hero.ruleta .hero-icon{color:#fff;background:linear-gradient(145deg,#ff75bc,#7d5cff)}.detail-hero.maquina_suerte .hero-icon{color:#153d40;background:linear-gradient(145deg,#a2fff3,#43d3c7)}.detail-hero>div{display:flex;flex:1;flex-direction:column}.detail-hero small{color:var(--color-accent);font-size:.56rem;font-weight:700;text-transform:uppercase}.detail-hero strong{margin-top:.18rem;font-size:1.05rem}.detail-hero em{margin-top:.12rem;color:var(--text-muted);font-size:.58rem;font-style:normal}.candidate-count{padding:.3rem .55rem;color:#ffadd3;background:rgba(255,86,171,.1);border-radius:7px;font-size:.58rem;font-weight:700}.detail-columns{display:grid;grid-template-columns:.8fr 1.2fr;gap:.8rem}.detail-columns>section{padding:.85rem;background:rgba(0,0,0,.13);border:1px solid var(--border-subtle);border-radius:13px}.detail-columns h4{margin:0 0 .7rem;color:var(--text-secondary);font-size:.64rem;text-transform:uppercase}.figure-detail{display:flex;align-items:center;gap:.85rem}.large-pattern{width:95px;flex:0 0 95px}.large-pattern i{display:grid;place-items:center;color:#513716;font-size:.5rem}.figure-detail>div{display:flex;min-width:0;flex-direction:column}.figure-detail small,.data-grid small{color:var(--text-muted);font-size:.52rem;text-transform:uppercase}.figure-detail strong{margin-top:.2rem;font-size:.8rem}.figure-detail em{margin-top:.15rem;color:#b9aaff;font-size:.58rem;font-style:normal}.data-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.45rem}.data-grid>div{padding:.5rem .6rem;background:rgba(255,255,255,.025);border:1px solid var(--border-subtle);border-radius:8px}.data-grid strong{display:block;margin-top:.2rem;overflow:hidden;font-size:.65rem;text-overflow:ellipsis;white-space:nowrap}
  @media(max-width:1250px){.summary-grid{grid-template-columns:repeat(3,1fr)}}@media(max-width:1050px){.summary-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:720px){.module-head{flex-direction:column}.head-actions{width:100%;flex-wrap:wrap}.summary-grid{grid-template-columns:1fr}.filters{align-items:stretch;flex-direction:column}.method-tabs{width:100%;overflow-x:auto}.method-tabs button{flex:1}.date-filter{flex-wrap:wrap}.date-filter label{flex:1}.date-filter input{width:100%}.search-field{width:100%;min-width:0}.detail-columns{grid-template-columns:1fr}.data-grid{grid-template-columns:1fr}.detail-hero{align-items:flex-start}.candidate-count{display:none}}
`;

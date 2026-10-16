import React, { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import { Workbook } from "exceljs";
import { saveAs } from "file-saver";
import AppButton from "../../../shared/components/Buttons/AppButton";
import AppIcon from "../../../shared/components/AppIcon";
import AppModal from "../../../shared/components/AppModal";
import { listUsers, ManagedUser } from "../services/adminUsers.service";
import { AssignedCard, AssignedCardsQuery, clearAllAssignedCardRegistrations, listAssignedCards } from "../services/assignedCards.service";
import { Catalogs, fetchCatalogs } from "../../auth/services/auth.service";

const PER_PAGE = 20;
/** Tope del volcado a Excel: el listado completo puede tener decenas de miles de filas. */
const EXPORT_LIMIT = 20000;

type StatusTab = "all" | "registered" | "available";

const TABS: { key: StatusTab; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "registered", label: "Registrados" },
  { key: "available", label: "Sin registrar" },
];

const labelOf = (options: { value: string; label: string }[] | undefined, value: string | null) =>
  options?.find((item) => item.value === value)?.label ?? value ?? "—";

const AssignedCardsPage: React.FC = () => {
  const [rows, setRows] = useState<AssignedCard[]>([]);
  const [summary, setSummary] = useState({ total: 0, registered: 0, available: 0, globalRegistered: 0 });
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isClearOpen, setIsClearOpen] = useState(false);
  const [clearConfirmation, setClearConfirmation] = useState("");
  const [isClearing, setIsClearing] = useState(false);

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [detail, setDetail] = useState<AssignedCard | null>(null);

  const [status, setStatus] = useState<StatusTab>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [userId, setUserId] = useState(0);
  const [municipio, setMunicipio] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    listUsers().then(setUsers).catch(() => undefined);
    fetchCatalogs().then(setCatalogs).catch(() => undefined);
  }, []);

  // La búsqueda espera a que el usuario deje de escribir para no consultar en cada tecla.
  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const query = useMemo<AssignedCardsQuery>(
    () => ({ status, search, userId, municipio, page, perPage: PER_PAGE }),
    [status, search, userId, municipio, page]
  );

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await listAssignedCards(query);
      setRows(result.data);
      setTotal(result.total);
      setSummary(result.summary);
    } catch {
      toast.error("No fue posible cargar los cartones asignados.");
    } finally { setIsLoading(false); }
  }, [query]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const registrarUsers = users.filter((user) => user.role === "registrador");

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Se exporta lo que el administrador está viendo, con los filtros aplicados.
      const result = await listAssignedCards({ ...query, page: 1, perPage: EXPORT_LIMIT });
      const workbook = new Workbook();
      const sheet = workbook.addWorksheet("Cartones asignados");
      sheet.addRow([
        "Cartón", "Responsable", "Bloque", "Estado", "Nombre completo", "Tipo ID", "Identificación",
        "Género", "Fecha nacimiento", "Contacto", "Municipio", "Sector", "Barrio / Vereda",
        "Desplazado", "Discapacidad", "Tipo discapacidad", "Cuidador", "Adulto mayor", "Registrado por",
      ]);
      result.data.forEach((row) => sheet.addRow([
        row.cardNumber,
        row.assignedToName ?? "",
        row.blockStart && row.blockEnd ? `${row.blockStart}–${row.blockEnd}` : "",
        row.status === "registered" ? "Registrado" : "Sin registrar",
        row.nombreCompleto ?? "",
        row.tipoIdentificacion ?? "",
        row.numeroIdentificacion ?? "",
        labelOf(catalogs?.generos, row.genero),
        row.fechaNacimiento ?? "",
        row.contacto ?? "",
        row.municipioLabel ?? "",
        labelOf(catalogs?.sectores, row.sector),
        row.nombreResidencia ?? "",
        row.desplazado ?? "",
        row.discapacidad ?? "",
        row.tipoDiscapacidadLabel ?? "",
        row.cuidador ?? "",
        row.adultoMayor ?? "",
        row.registeredByName ?? "",
      ]));
      sheet.getRow(1).font = { bold: true };
      sheet.columns.forEach((column) => { column.width = 18; });

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "cartones-asignados.xlsx");
      toast.success(`${result.data.length.toLocaleString("es-CO")} filas exportadas.`);
    } catch {
      toast.error("No fue posible exportar el listado.");
    } finally { setIsExporting(false); }
  };

  const resetFilters = () => { setStatus("all"); setSearchInput(""); setUserId(0); setMunicipio(""); setPage(1); };
  const hasFilters = status !== "all" || Boolean(search) || userId !== 0 || Boolean(municipio);

  const closeClearModal = () => {
    if (isClearing) return;
    setIsClearOpen(false);
    setClearConfirmation("");
  };

  const handleClearAll = async () => {
    if (clearConfirmation.trim().toUpperCase() !== "BORRAR") return;
    setIsClearing(true);
    try {
      const deleted = await clearAllAssignedCardRegistrations();
      toast.success(deleted === 1 ? "Se eliminó 1 registro de cartón." : `Se eliminaron ${deleted.toLocaleString("es-CO")} registros de cartones.`);
      setDetail(null);
      setPage(1);
      setIsClearOpen(false);
      setClearConfirmation("");
      await load();
    } catch {
      toast.error("No fue posible borrar los registros de cartones.");
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <AssignedCardsPageStyle>
      <header className="module-head">
        <div>
          <span className="eyebrow">Administración</span>
          <h1 className="page-heading">Cartones asignados</h1>
          <p className="page-caption">Todos los cartones entregados a los registradores, con los datos de la persona titular.</p>
        </div>
        <div className="head-actions">
          <AppButton variant="danger" outlined icon="trash-alt" label="Borrar registros" onClick={() => setIsClearOpen(true)} disabled={summary.globalRegistered === 0} />
          <AppButton icon="receipt" label={isExporting ? "Exportando…" : "Exportar Excel"} onClick={handleExport} disabled={isExporting || summary.total === 0} />
        </div>
      </header>

      <div className="stat-row">
        <div className="stat"><small>Cartones asignados</small><strong>{summary.total.toLocaleString("es-CO")}</strong></div>
        <div className="stat"><small>Con persona registrada</small><strong>{summary.registered.toLocaleString("es-CO")}</strong></div>
        <div className="stat"><small>Sin registrar</small><strong>{summary.available.toLocaleString("es-CO")}</strong></div>
        <div className="stat accent"><small>Avance</small><strong>{summary.total ? Math.round((summary.registered / summary.total) * 100) : 0}%</strong></div>
      </div>

      <section className="filters surface-card">
        <div className="segmented">
          {TABS.map((tab) => (
            <button key={tab.key} className={status === tab.key ? "active" : ""} onClick={() => { setStatus(tab.key); setPage(1); }}>{tab.label}</button>
          ))}
        </div>
        <label className="search-field">
          <AppIcon icon="search" />
          <input className="form-input" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Cartón, nombre, identificación o responsable…" />
        </label>
        <select className="form-input" value={userId} onChange={(event) => { setUserId(Number(event.target.value)); setPage(1); }}>
          <option value={0}>Todos los responsables</option>
          {registrarUsers.map((user) => <option key={user.id} value={user.id}>{user.fullName}</option>)}
        </select>
        <select className="form-input" value={municipio} onChange={(event) => { setMunicipio(event.target.value); setPage(1); }}>
          <option value="">Todos los municipios</option>
          {catalogs?.municipios.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        {hasFilters && <AppButton variant="transparent" icon="times" label="Limpiar" onClick={resetFilters} />}
      </section>

      <section className="table-card surface-card">
        {isLoading ? (
          <div className="state-note"><AppIcon icon="rotate" className="spin" />Cargando cartones…</div>
        ) : rows.length === 0 ? (
          <div className="state-note"><AppIcon icon="clone" />{hasFilters ? "Ningún cartón coincide con los filtros." : "Todavía no hay bloques asignados."}</div>
        ) : (
          <>
            <div className="table-scroll">
              <table className="vs-dataTable">
                <thead>
                  <tr><th>Cartón</th><th>Persona</th><th>Identificación</th><th>Municipio</th><th>Contacto</th><th>Condición</th><th>Responsable</th><th /></tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.cardNumber} className={row.status === "available" ? "is-empty" : ""}>
                      <td><span className="card-chip">#{row.cardNumber.toLocaleString("es-CO")}</span></td>
                      <td>
                        {row.nombreCompleto
                          ? <div className="person-cell"><strong>{row.nombreCompleto}</strong><small>{row.nombreResidencia ?? "—"}</small></div>
                          : <span className="empty-note">Sin registrar</span>}
                      </td>
                      <td>{row.numeroIdentificacion ? `${row.tipoIdentificacion} ${row.numeroIdentificacion}` : "—"}</td>
                      <td>{row.municipioLabel ?? "—"}</td>
                      <td>{row.contacto ?? "—"}</td>
                      <td>
                        <div className="flag-cell">
                          {row.discapacidad === "SI" && <span className="flag gold">Discapacidad</span>}
                          {row.cuidador === "SI" && <span className="flag rose">Cuidador</span>}
                          {row.adultoMayor === "SI" && <span className="flag teal">Adulto mayor</span>}
                          {row.desplazado === "SI" && <span className="flag teal">Desplazado</span>}
                          {row.status === "registered" && row.discapacidad !== "SI" && row.cuidador !== "SI" && row.adultoMayor !== "SI" && row.desplazado !== "SI" && <span className="empty-note">—</span>}
                        </div>
                      </td>
                      <td><small className="muted">{row.assignedToName ?? "—"}</small></td>
                      <td>
                        {row.status === "registered" && (
                          <AppButton icon="search" variant="transparent" className="detail-action" onClick={() => setDetail(row)} ariaLabel={`Ver detalle del cartón ${row.cardNumber}`} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="table-foot">
              <span>{total.toLocaleString("es-CO")} {total === 1 ? "cartón" : "cartones"} · página {page} de {totalPages}</span>
              <div className="pager">
                <AppButton variant="transparent" icon="angle-double-left" onClick={() => setPage(1)} disabled={page === 1} ariaLabel="Primera página" />
                <AppButton variant="transparent" icon="angle-left" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} ariaLabel="Página anterior" />
                <AppButton variant="transparent" icon="angle-right" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages} ariaLabel="Página siguiente" />
                <AppButton variant="transparent" icon="angle-double-right" onClick={() => setPage(totalPages)} disabled={page >= totalPages} ariaLabel="Última página" />
              </div>
            </div>
          </>
        )}
      </section>

      <AppModal title={`Cartón #${detail?.cardNumber ?? ""}`} isOpen={Boolean(detail)} onClose={() => setDetail(null)}>
        {detail && (
          <div className="detail-grid">
            {[
              ["Nombre completo", detail.nombreCompleto],
              ["Identificación", detail.numeroIdentificacion ? `${detail.tipoIdentificacion} ${detail.numeroIdentificacion}` : null],
              ["Género", labelOf(catalogs?.generos, detail.genero)],
              ["Fecha de nacimiento", detail.fechaNacimiento],
              ["Contacto", detail.contacto],
              ["Municipio", detail.municipioLabel],
              ["Sector", labelOf(catalogs?.sectores, detail.sector)],
              ["Barrio / Vereda", detail.nombreResidencia],
              ["Desplazado", detail.desplazado === "SI" ? "Sí" : "No"],
              ["Discapacidad", detail.discapacidad === "SI" ? (detail.tipoDiscapacidadLabel ?? "Sí") : "No"],
              ["Cuidador", detail.cuidador === "SI" ? "Sí" : "No"],
              ["Adulto mayor", detail.adultoMayor === "SI" ? "Sí" : "No"],
              ["Responsable del bloque", detail.assignedToName],
              ["Registrado por", detail.registeredByName],
            ].map(([label, value]) => (
              <div className="detail-item" key={label as string}>
                <small>{label}</small>
                <strong>{value || "—"}</strong>
              </div>
            ))}
          </div>
        )}
      </AppModal>

      <AppModal title="Borrar todos los registros" isOpen={isClearOpen} onClose={closeClearModal}>
        <div className="clear-warning">
          <div className="warning-symbol"><AppIcon icon="triangle-exclamation" /></div>
          <div>
            <span className="warning-kicker">Acción irreversible</span>
            <h4>Se borrarán {summary.globalRegistered.toLocaleString("es-CO")} registros</h4>
            <p>Los datos personales asociados a los cartones registrados dejarán de estar disponibles.</p>
          </div>
        </div>
        <div className="preserved-note">
          <AppIcon icon="shield" />
          <span>Se conservarán los bloques asignados, usuarios, cartones disponibles y el historial de ganadores.</span>
        </div>
        <label className="confirmation-field">
          <span>Escribe <strong>BORRAR</strong> para confirmar</span>
          <input
            className="form-input"
            value={clearConfirmation}
            onChange={(event) => setClearConfirmation(event.target.value)}
            placeholder="BORRAR"
            autoComplete="off"
            autoFocus
          />
        </label>
        <div className="modal-actions">
          <AppButton variant="light" label="Cancelar" onClick={closeClearModal} disabled={isClearing} />
          <AppButton
            variant="danger"
            icon="trash-alt"
            label={isClearing ? "Borrando…" : "Borrar definitivamente"}
            onClick={handleClearAll}
            disabled={isClearing || clearConfirmation.trim().toUpperCase() !== "BORRAR"}
          />
        </div>
      </AppModal>
    </AssignedCardsPageStyle>
  );
};

export default AssignedCardsPage;

const AssignedCardsPageStyle = styled.div`
  .module-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 1.5rem; margin-bottom: 1.25rem; }
  .head-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: .55rem; }
  .head-actions .vs-outlined--danger { color: #ff8f9d; background: rgba(255,74,96,.06); border-color: rgba(255,74,96,.35); }
  .eyebrow { color: var(--color-secondary); font-size: .62rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
  .page-heading { margin: .35rem 0 0; font-size: 1.45rem; }
  .page-caption { max-width: 56ch; margin: .4rem 0 0; color: var(--text-muted); font-size: .72rem; }

  .stat-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: .8rem; margin-bottom: 1rem; }
  .stat { padding: .9rem 1rem; background: var(--bg-panel); border: 1px solid var(--border-subtle); border-radius: 14px; }
  .stat small { display: block; color: var(--text-muted); font-size: .58rem; letter-spacing: .04em; text-transform: uppercase; }
  .stat strong { display: block; margin-top: .3rem; color: var(--text-primary); font-size: 1.3rem; }
  .stat.accent { background: rgba(var(--color-primary-rgb),.1); border-color: rgba(var(--color-primary-rgb),.25); }
  .stat.accent strong { color: #b7a8ff; }

  .filters { display: flex; flex-wrap: wrap; align-items: center; gap: .6rem; margin-bottom: 1rem; padding: .75rem .9rem; }
  .segmented { display: inline-flex; gap: .2rem; padding: .22rem; background: rgba(0,0,0,.2); border: 1px solid var(--border-subtle); border-radius: 11px; }
  .segmented button { padding: .42rem .8rem; color: var(--text-muted); white-space: nowrap; background: transparent; border: 0; border-radius: 8px; font-size: .68rem; font-weight: 600; cursor: pointer; transition: background .18s ease, color .18s ease; }
  .segmented button:hover { color: var(--text-primary); }
  .segmented button.active { color: #fff; background: linear-gradient(135deg, #8a6bff, #6847f2); }
  .search-field { position: relative; display: flex; min-width: 230px; flex: 1; align-items: center; }
  .search-field svg { position: absolute; left: .7rem; color: var(--text-muted); font-size: .7rem; pointer-events: none; }
  .search-field input { padding-left: 2rem; }
  .filters select { max-width: 200px; }

  .table-card { padding: 1rem 1.1rem; }
  .table-scroll { overflow-x: auto; }
  .state-note { display: flex; align-items: center; justify-content: center; gap: .5rem; padding: 2.5rem; color: var(--text-muted); font-size: .74rem; }
  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  tr.is-empty td { opacity: .62; }
  .card-chip { padding: .28rem .55rem; color: var(--color-accent); background: rgba(255,184,77,.09); border: 1px solid rgba(255,184,77,.2); border-radius: 8px; font-size: .68rem; font-weight: 700; white-space: nowrap; }
  .person-cell { display: flex; flex-direction: column; }
  .person-cell strong { font-size: .74rem; }
  .person-cell small { margin-top: .15rem; color: var(--text-muted); font-size: .6rem; }
  .empty-note { color: var(--text-muted); font-size: .66rem; font-style: italic; }
  .muted { color: var(--text-muted); font-size: .66rem; }

  .flag-cell { display: flex; flex-wrap: wrap; gap: .25rem; }
  .flag { padding: .2rem .45rem; border: 1px solid; border-radius: 6px; font-size: .55rem; font-weight: 700; white-space: nowrap; }
  .flag.gold { color: #ffd85e; background: rgba(255,216,94,.1); border-color: rgba(255,216,94,.28); }
  .flag.rose { color: #ffb3c7; background: rgba(255,110,150,.1); border-color: rgba(255,110,150,.3); }
  .flag.teal { color: #a9f2e2; background: rgba(39,211,178,.1); border-color: rgba(39,211,178,.28); }
  .detail-action .vs-btn { width: 30px; min-height: 30px; }

  .table-foot { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-top: .9rem; padding-top: .8rem; border-top: 1px solid var(--border-subtle); color: var(--text-muted); font-size: .66rem; }
  .pager { display: flex; gap: .2rem; }
  .pager .vs-btn { width: 30px; min-height: 30px; }

  .detail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .7rem; }
  .detail-item { padding: .6rem .75rem; background: rgba(0,0,0,.16); border: 1px solid var(--border-subtle); border-radius: 10px; }
  .detail-item small { display: block; color: var(--text-muted); font-size: .56rem; letter-spacing: .05em; text-transform: uppercase; }
  .detail-item strong { display: block; margin-top: .25rem; color: var(--text-primary); font-size: .74rem; font-weight: 600; }

  .clear-warning { display: flex; align-items: flex-start; gap: .9rem; }
  .warning-symbol { display: grid; width: 44px; height: 44px; flex: 0 0 auto; place-items: center; color: #ff8796; background: rgba(255,74,96,.1); border: 1px solid rgba(255,74,96,.25); border-radius: 13px; }
  .warning-kicker { color: #ff8796; font-size: .58rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
  .clear-warning h4 { margin: .25rem 0 .35rem; color: var(--text-primary); font-size: 1rem; }
  .clear-warning p { margin: 0; color: var(--text-muted); font-size: .72rem; line-height: 1.55; }
  .preserved-note { display: flex; align-items: flex-start; gap: .55rem; margin: 1rem 0; padding: .7rem .8rem; color: #a9f2e2; background: rgba(39,211,178,.07); border: 1px solid rgba(39,211,178,.18); border-radius: 10px; font-size: .67rem; line-height: 1.5; }
  .preserved-note svg { margin-top: .12rem; flex: 0 0 auto; }
  .confirmation-field { display: block; }
  .confirmation-field > span { display: block; margin-bottom: .42rem; color: var(--text-secondary); font-size: .67rem; }
  .confirmation-field input { width: 100%; letter-spacing: .1em; text-transform: uppercase; }
  .modal-actions { display: flex; justify-content: flex-end; gap: .55rem; margin-top: 1rem; }

  @media (max-width: 900px) {
    .module-head { flex-direction: column; }
    .head-actions { width: 100%; justify-content: flex-start; }
    .stat-row { grid-template-columns: repeat(2, 1fr); }
    .detail-grid { grid-template-columns: 1fr; }
  }
`;

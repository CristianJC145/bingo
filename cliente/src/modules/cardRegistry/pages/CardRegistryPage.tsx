import React, { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import AppButton from "../../../shared/components/Buttons/AppButton";
import AppIcon from "../../../shared/components/AppIcon";
import AppModal from "../../../shared/components/AppModal";
import RegistrationFormComponent from "../components/RegistrationForm";
import { Catalogs, fetchCatalogs } from "../../auth/services/auth.service";
import { useAuth } from "../../auth/context/AuthContext";
import {
  RegistrationForm,
  RegistrationRow,
  RegistrationSummary,
  deleteRegistration,
  listRegistrations,
  saveRegistration,
} from "../services/cardRegistry.service";

interface ApiError { response?: { data?: { message?: string } }; }
const errorMessage = (caught: unknown, fallback: string) => (caught as ApiError).response?.data?.message ?? fallback;

type StatusTab = "all" | "registered" | "available";
const TABS: { key: StatusTab; label: string; icon: "list" | "check" | "clone" }[] = [
  { key: "all", label: "Todos", icon: "list" },
  { key: "registered", label: "Entregados", icon: "check" },
  { key: "available", label: "Disponibles", icon: "clone" },
];

const PER_PAGE = 15;
const emptySummary: RegistrationSummary = { total: 0, registered: 0, available: 0 };

const formatDate = (iso?: string) => {
  if (!iso) return "—";
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
};

const CardRegistryPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [rows, setRows] = useState<RegistrationRow[]>([]);
  const [summary, setSummary] = useState<RegistrationSummary>(emptySummary);
  const [total, setTotal] = useState(0);
  const [tab, setTab] = useState<StatusTab>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const [editing, setEditing] = useState<RegistrationRow | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toDelete, setToDelete] = useState<RegistrationRow | null>(null);

  const labelMaps = useMemo(() => {
    if (!catalogs) return null;
    const build = (options: { value: string; label: string }[]) => new Map(options.map((option) => [option.value, option.label]));
    return {
      municipios: build(catalogs.municipios),
      tiposIdentificacion: build(catalogs.tiposIdentificacion),
      generos: build(catalogs.generos),
      sectores: build(catalogs.sectores),
      tiposDiscapacidad: build(catalogs.tiposDiscapacidad),
    };
  }, [catalogs]);

  useEffect(() => {
    fetchCatalogs().then(setCatalogs).catch(() => toast.error("No fue posible cargar los catálogos."));
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await listRegistrations({ status: tab, search, page, perPage: PER_PAGE });
      setRows(result.data);
      setTotal(result.total);
      setSummary(result.summary);
    } catch (caught) {
      toast.error(errorMessage(caught, "No fue posible cargar los cartones."));
    } finally { setIsLoading(false); }
  }, [tab, search, page]);

  useEffect(() => {
    const timeoutId = window.setTimeout(load, 250);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  useEffect(() => { setPage(1); }, [tab, search]);

  const handleSave = async (values: RegistrationForm) => {
    if (!editing) return;
    setIsSaving(true);
    try {
      await saveRegistration(editing.cardNumber, values);
      toast.success(`Cartón ${editing.cardNumber} registrado correctamente.`);
      setEditing(null);
      await load();
    } catch (caught) {
      toast.error(errorMessage(caught, "No fue posible guardar el registro."));
    } finally { setIsSaving(false); }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteRegistration(toDelete.cardNumber);
      toast.success(`Registro del cartón ${toDelete.cardNumber} eliminado.`);
      setToDelete(null);
      await load();
    } catch (caught) {
      toast.error(errorMessage(caught, "No fue posible eliminar el registro."));
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const progressPercent = summary.total > 0 ? Math.round((summary.registered / summary.total) * 100) : 0;

  return (
    <CardRegistryStyle>
      <header className="module-head">
        <div>
          <span className="eyebrow">Registro de cartones</span>
          <h1 className="page-heading">{isAdmin ? "Matriz global de cartones" : "Mis cartones asignados"}</h1>
        </div>
        <div className="progress-chip">
          <div className="chip-copy"><small>Avance</small><strong>{summary.registered.toLocaleString("es-CO")} / {summary.total.toLocaleString("es-CO")}</strong></div>
          <div className="chip-bar"><span style={{ width: `${progressPercent}%` }} /></div>
        </div>
      </header>

      {summary.total === 0 && !isLoading ? (
        <section className="empty-card surface-card">
          <span className="empty-icon"><AppIcon icon="clone" /></span>
          <h2>No tienes cartones asignados</h2>
          <p>Pídele al administrador que te asigne un bloque de cartones para comenzar a registrar.</p>
        </section>
      ) : (
        <section className="registry-card surface-card">
          <div className="registry-toolbar">
            <nav className="segmented">
              {TABS.map((item) => (
                <button key={item.key} className={tab === item.key ? "active" : ""} onClick={() => setTab(item.key)}>
                  <AppIcon icon={item.icon} />{item.label}
                  <b>{item.key === "all" ? summary.total : item.key === "registered" ? summary.registered : summary.available}</b>
                </button>
              ))}
            </nav>
            <div className="search-box">
              <AppIcon icon="search" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por N° cartón, nombre o cédula…" />
            </div>
          </div>

          <div className="table-scroll">
            <table className="vs-dataTable">
              <thead>
                <tr>
                  <th>N° Cartón</th><th>Nombre completo</th><th>Identificación</th><th>Municipio</th>
                  <th>Sector</th><th>Nacimiento</th><th>Contacto</th><th>Estado</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={9}><div className="state-note"><AppIcon icon="rotate" className="spin" />Cargando…</div></td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={9}><div className="state-note">No se encontraron cartones con ese criterio.</div></td></tr>
                ) : rows.map((row) => (
                  <tr key={row.cardNumber} className={row.status}>
                    <td><span className="card-number">{row.cardNumber}</span></td>
                    <td>{row.nombreCompleto ?? <span className="muted">—</span>}</td>
                    <td>{row.numeroIdentificacion ? `${labelMaps?.tiposIdentificacion.get(row.tipoIdentificacion ?? "") ?? ""} ${row.numeroIdentificacion}`.trim() : <span className="muted">—</span>}</td>
                    <td>{row.municipio ? labelMaps?.municipios.get(row.municipio) ?? row.municipio : <span className="muted">—</span>}</td>
                    <td>{row.sector ? labelMaps?.sectores.get(row.sector) ?? row.sector : <span className="muted">—</span>}</td>
                    <td>{row.fechaNacimiento ? formatDate(row.fechaNacimiento) : <span className="muted">—</span>}</td>
                    <td>{row.contacto ?? <span className="muted">—</span>}</td>
                    <td><span className={`status-chip ${row.status}`}>{row.status === "registered" ? "Entregado" : "Disponible"}</span></td>
                    <td>
                      <div className="row-actions">
                        <AppButton
                          icon={row.status === "registered" ? "edit" : "plus"}
                          variant={row.status === "registered" ? "light" : "primary"}
                          onClick={() => setEditing(row)}
                          ariaLabel={row.status === "registered" ? `Editar cartón ${row.cardNumber}` : `Registrar cartón ${row.cardNumber}`}
                        />
                        {row.status === "registered" && (
                          <AppButton icon="trash-alt" variant="transparent" className="danger-action" onClick={() => setToDelete(row)} ariaLabel={`Eliminar registro ${row.cardNumber}`} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="registry-footer">
            <span>{total.toLocaleString("es-CO")} cartón(es) · página {page} de {totalPages}</span>
            <div className="pagination">
              <AppButton icon="angle-left" variant="light" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} ariaLabel="Página anterior" />
              <AppButton icon="angle-right" variant="light" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages} ariaLabel="Página siguiente" />
            </div>
          </div>
        </section>
      )}

      <AppModal
        title={editing?.status === "registered" ? `Editar cartón ${editing?.cardNumber}` : `Registrar cartón ${editing?.cardNumber ?? ""}`}
        size="md"
        isOpen={Boolean(editing) && Boolean(catalogs)}
        onClose={() => setEditing(null)}
      >
        {editing && catalogs && (
          <RegistrationFormComponent
            cardNumber={editing.cardNumber}
            catalogs={catalogs}
            initial={editing}
            isSaving={isSaving}
            onCancel={() => setEditing(null)}
            onSave={handleSave}
          />
        )}
      </AppModal>

      <AppModal title="Eliminar registro" isOpen={Boolean(toDelete)} onClose={() => setToDelete(null)}>
        <div className="delete-confirm">
          <span><AppIcon icon="trash-alt" /></span>
          <h3>¿Eliminar el registro del cartón {toDelete?.cardNumber}?</h3>
          <p>Los datos de <strong>{toDelete?.nombreCompleto}</strong> se borrarán y el cartón volverá a quedar disponible.</p>
          <div><AppButton variant="transparent" label="Cancelar" onClick={() => setToDelete(null)} /><AppButton variant="danger" icon="trash-alt" label="Eliminar" onClick={handleDelete} /></div>
        </div>
      </AppModal>
    </CardRegistryStyle>
  );
};

export default CardRegistryPage;

const CardRegistryStyle = styled.div`
  .module-head { display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; margin-bottom: 1.25rem; }
  .eyebrow { color: var(--color-secondary); font-size: .62rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
  .page-heading { margin: .35rem 0 0; font-size: 1.45rem; }
  .progress-chip { display: flex; min-width: 200px; flex-direction: column; gap: .45rem; padding: .75rem .9rem; background: var(--bg-panel); border: 1px solid var(--border-subtle); border-radius: 14px; }
  .chip-copy { display: flex; align-items: baseline; justify-content: space-between; gap: .8rem; }
  .chip-copy small { color: var(--text-muted); font-size: .56rem; letter-spacing: .06em; text-transform: uppercase; }
  .chip-copy strong { color: var(--text-primary); font-size: .8rem; }
  .chip-bar { height: 5px; overflow: hidden; background: rgba(255,255,255,.06); border-radius: 99px; }
  .chip-bar span { display: block; height: 100%; background: linear-gradient(90deg, var(--color-primary), var(--color-secondary)); border-radius: inherit; }

  .empty-card { display: flex; align-items: center; justify-content: center; flex-direction: column; padding: 3.5rem 1.5rem; text-align: center; }
  .empty-icon { display: grid; width: 52px; height: 52px; margin-bottom: 1rem; place-items: center; color: #a08bff; background: rgba(var(--color-primary-rgb),.1); border-radius: 16px; font-size: 1.2rem; }
  .empty-card h2 { margin: 0; color: var(--text-primary); font-size: 1rem; }
  .empty-card p { max-width: 380px; margin: .5rem 0 0; color: var(--text-secondary); font-size: .74rem; line-height: 1.55; }

  .registry-card { display: flex; flex-direction: column; padding: 0; overflow: hidden; }
  .registry-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: .8rem; padding: 1rem 1.2rem; border-bottom: 1px solid var(--border-subtle); }
  .segmented { display: inline-flex; gap: .25rem; padding: .28rem; background: rgba(0,0,0,.2); border: 1px solid var(--border-subtle); border-radius: 12px; }
  .segmented button { display: flex; align-items: center; gap: .45rem; padding: .55rem .9rem; color: var(--text-muted); white-space: nowrap; background: transparent; border: 0; border-radius: 9px; font-size: .7rem; font-weight: 600; cursor: pointer; transition: background .18s ease, color .18s ease; }
  .segmented button b { padding: .12rem .35rem; background: rgba(255,255,255,.07); border-radius: 5px; font-size: .58rem; }
  .segmented button:hover { color: var(--text-primary); }
  .segmented button.active { color: #fff; background: linear-gradient(135deg, #8a6bff, #6847f2); box-shadow: 0 6px 16px rgba(104,71,242,.25); }
  .segmented button.active b { background: rgba(0,0,0,.22); }
  .search-box { display: flex; align-items: center; gap: .5rem; width: min(100%, 320px); padding: .5rem .7rem; background: var(--bg-soft); border: 1px solid var(--border-subtle); border-radius: 10px; }
  .search-box svg { color: var(--text-muted); font-size: .7rem; }
  .search-box input { width: 100%; color: var(--text-primary); background: transparent; border: 0; outline: 0; font-size: .7rem; }

  .table-scroll { overflow-x: auto; }
  .state-note { display: flex; align-items: center; justify-content: center; gap: .5rem; padding: 2.5rem; color: var(--text-muted); font-size: .74rem; }
  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .card-number { display: inline-block; min-width: 42px; padding: .28rem .45rem; color: var(--text-primary); background: rgba(255,255,255,.05); border: 1px solid var(--border-subtle); border-radius: 7px; font-size: .7rem; font-weight: 700; text-align: center; }
  tr.registered .card-number { color: var(--color-accent); background: rgba(255,184,77,.09); border-color: rgba(255,184,77,.2); }
  .muted { color: var(--text-muted); }
  .status-chip { padding: .3rem .55rem; border-radius: 7px; font-size: .58rem; font-weight: 700; white-space: nowrap; }
  .status-chip.registered { color: var(--color-secondary); background: rgba(var(--color-secondary-rgb),.1); }
  .status-chip.available { color: var(--text-muted); background: rgba(255,255,255,.05); }
  .row-actions { display: flex; gap: .3rem; }
  .row-actions .vs-btn { width: 30px; min-height: 30px; }
  .danger-action .vs-btn { color: var(--color-danger); }
  .registry-footer { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: .9rem 1.2rem; color: var(--text-muted); font-size: .64rem; border-top: 1px solid var(--border-subtle); }
  .pagination { display: flex; gap: .4rem; }
  .pagination .vs-btn { width: 32px; min-height: 32px; }

  .delete-confirm { text-align: center; }
  .delete-confirm > span { display: grid; width: 48px; height: 48px; margin: 0 auto .9rem; place-items: center; color: #ff788d; background: rgba(var(--color-danger-rgb),.08); border-radius: 14px; }
  .delete-confirm h3 { margin: 0; color: #fff; font-size: .9rem; }
  .delete-confirm p { margin: .4rem 0 1.2rem; color: var(--text-muted); font-size: .68rem; line-height: 1.5; }
  .delete-confirm > div { display: grid; grid-template-columns: 1fr 1fr; gap: .5rem; }
  .delete-confirm .vs-btn { width: 100%; }
  @media (max-width: 800px) { .module-head { flex-direction: column; align-items: flex-start; } .registry-toolbar { align-items: stretch; flex-direction: column; } }
`;

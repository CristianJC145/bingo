import React, { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import AppButton from "../../../shared/components/Buttons/AppButton";
import AppIcon from "../../../shared/components/AppIcon";
import AppModal from "../../../shared/components/AppModal";
import { CardAssignment, ManagedUser, clearAssignmentRegistrations, createAssignment, deleteAssignment, listAssignments, listUsers, updateAssignmentMunicipality } from "../services/adminUsers.service";
import { CatalogOption, fetchCatalogs } from "../../auth/services/auth.service";

interface ApiError { response?: { data?: { message?: string } }; }
const errorMessage = (caught: unknown, fallback: string) => (caught as ApiError).response?.data?.message ?? fallback;

const AssignmentsPage: React.FC = () => {
  const [assignments, setAssignments] = useState<CardAssignment[]>([]);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [municipalities, setMunicipalities] = useState<CatalogOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [toDelete, setToDelete] = useState<CardAssignment | null>(null);
  const [toClear, setToClear] = useState<CardAssignment | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [form, setForm] = useState({ userId: "", startCard: "", quantity: "", municipio: "" });

  const load = useCallback(async () => {
    try {
      const [assignmentList, userList, catalogs] = await Promise.all([listAssignments(), listUsers(), fetchCatalogs()]);
      setAssignments(assignmentList);
      setUsers(userList);
      setMunicipalities(catalogs.municipios);
    } catch { toast.error("No fue posible cargar las asignaciones."); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // El siguiente cartón libre es el que sigue al bloque asignado más alto.
  const nextFreeCard = useMemo(
    () => (assignments.length === 0 ? 1 : Math.max(...assignments.map((item) => item.endCard)) + 1),
    [assignments]
  );

  const openCreate = () => {
    setForm({ userId: users.find((user) => user.role === "registrador" && user.active)?.id.toString() ?? "", startCard: String(nextFreeCard), quantity: "", municipio: municipalities[0]?.value ?? "" });
    setIsCreateOpen(true);
  };

  const startCard = Number(form.startCard);
  const quantity = Number(form.quantity);
  const endCard = Number.isInteger(startCard) && Number.isInteger(quantity) && quantity > 0 ? startCard + quantity - 1 : null;
  const canCreate = Boolean(form.userId) && Boolean(form.municipio) && Number.isInteger(startCard) && startCard > 0 && Number.isInteger(quantity) && quantity > 0;

  const handleCreate = async () => {
    if (!canCreate || endCard === null) return;
    setIsSaving(true);
    try {
      await createAssignment({ userId: Number(form.userId), startCard, endCard, municipio: form.municipio });
      toast.success(`Cartones ${startCard}–${endCard} asignados correctamente.`);
      setIsCreateOpen(false);
      await load();
    } catch (caught) {
      toast.error(errorMessage(caught, "No fue posible asignar los cartones."));
    } finally { setIsSaving(false); }
  };

  const handleMunicipalityChange = async (assignment: CardAssignment, municipio: string) => {
    if (!municipio || municipio === assignment.municipio) return;
    try {
      await updateAssignmentMunicipality(assignment.id, municipio);
      setAssignments((current) => current.map((item) => item.id === assignment.id
        ? { ...item, municipio, municipioLabel: municipalities.find((option) => option.value === municipio)?.label ?? municipio }
        : item));
      toast.success("Municipio del bloque actualizado.");
    } catch (caught) { toast.error(errorMessage(caught, "No fue posible actualizar el municipio.")); }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteAssignment(toDelete.id);
      toast.success("Asignación eliminada.");
      setToDelete(null);
      await load();
    } catch (caught) {
      toast.error(errorMessage(caught, "No fue posible eliminar la asignación."));
    }
  };

  const handleClearRegistrations = async () => {
    if (!toClear) return;
    setIsClearing(true);
    try {
      const deleted = await clearAssignmentRegistrations(toClear.id);
      setAssignments((current) => current.map((item) => item.id === toClear.id ? { ...item, registeredCards: 0 } : item));
      toast.success(deleted === 1 ? "Se eliminó 1 registro del bloque." : `Se eliminaron ${deleted.toLocaleString("es-CO")} registros del bloque.`);
      setToClear(null);
    } catch (caught) {
      toast.error(errorMessage(caught, "No fue posible borrar los registros del bloque."));
    } finally { setIsClearing(false); }
  };

  const totalAssigned = assignments.reduce((sum, item) => sum + item.totalCards, 0);
  const totalRegistered = assignments.reduce((sum, item) => sum + item.registeredCards, 0);

  return (
    <AssignmentsPageStyle>
      <header className="module-head">
        <div><span className="eyebrow">Administración</span><h1 className="page-heading">Asignación de cartones</h1></div>
        <AppButton icon="plus" label="Asignar bloque" onClick={openCreate} />
      </header>

      <div className="stat-row">
        <div className="stat"><small>Bloques asignados</small><strong>{assignments.length}</strong></div>
        <div className="stat"><small>Cartones asignados</small><strong>{totalAssigned.toLocaleString("es-CO")}</strong></div>
        <div className="stat"><small>Ya registrados</small><strong>{totalRegistered.toLocaleString("es-CO")}</strong></div>
        <div className="stat accent"><small>Siguiente libre</small><strong>#{nextFreeCard.toLocaleString("es-CO")}</strong></div>
      </div>

      <section className="table-card surface-card">
        {isLoading ? (
          <div className="state-note"><AppIcon icon="rotate" className="spin" />Cargando asignaciones…</div>
        ) : assignments.length === 0 ? (
          <div className="state-note"><AppIcon icon="clone" />Todavía no has asignado bloques de cartones.</div>
        ) : (
          <div className="table-scroll">
            <table className="vs-dataTable">
              <thead><tr><th>Responsable</th><th>Municipio</th><th>Rango</th><th>Cantidad</th><th>Avance</th><th>Acciones</th></tr></thead>
              <tbody>
                {assignments.map((assignment) => {
                  const percent = assignment.totalCards > 0 ? Math.round((assignment.registeredCards / assignment.totalCards) * 100) : 0;
                  return (
                    <tr key={assignment.id}>
                      <td><div className="user-cell"><strong>{assignment.userFullName}</strong><small>@{assignment.username}</small></div></td>
                      <td><select className={`municipality-select ${assignment.municipio ? "" : "pending"}`} value={assignment.municipio ?? ""} onChange={(event) => handleMunicipalityChange(assignment, event.target.value)}><option value="">Municipio pendiente…</option>{municipalities.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></td>
                      <td><span className="range-chip">{assignment.startCard.toLocaleString("es-CO")} — {assignment.endCard.toLocaleString("es-CO")}</span></td>
                      <td>{assignment.totalCards.toLocaleString("es-CO")}</td>
                      <td>
                        <div className="progress-cell">
                          <div className="progress-bar"><span style={{ width: `${percent}%` }} /></div>
                          <small>{assignment.registeredCards.toLocaleString("es-CO")} / {assignment.totalCards.toLocaleString("es-CO")} · {percent}%</small>
                        </div>
                      </td>
                      <td><div className="row-actions"><AppButton icon="times" variant="transparent" className="clear-action" onClick={() => setToClear(assignment)} disabled={assignment.registeredCards === 0} ariaLabel="Borrar registros del bloque" /><AppButton icon="trash-alt" variant="transparent" className="danger-action" onClick={() => setToDelete(assignment)} ariaLabel="Eliminar asignación" /></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <AppModal title="Asignar bloque de cartones" isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)}>
        <div className="form-grid">
          <label>
            <span>Responsable</span>
            <select className="form-input" value={form.userId} onChange={(event) => setForm({ ...form, userId: event.target.value })}>
              <option value="">Selecciona un usuario…</option>
              {users.filter((user) => user.active && user.role === "registrador").map((user) => (
                <option key={user.id} value={user.id}>{user.fullName} (@{user.username})</option>
              ))}
            </select>
          </label>
          <label>
            <span>Municipio del bloque</span>
            <select className="form-input" value={form.municipio} onChange={(event) => setForm({ ...form, municipio: event.target.value })}>
              <option value="">Selecciona un municipio…</option>
              {municipalities.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
            </select>
          </label>
          <div className="range-grid">
            <label><span>Desde el cartón</span><input className="form-input" type="number" min="1" value={form.startCard} onChange={(event) => setForm({ ...form, startCard: event.target.value })} /></label>
            <label><span>Cantidad</span><input className="form-input" type="number" min="1" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} placeholder="Ej. 2000" /></label>
          </div>
          {endCard !== null && (
            <div className="range-preview">
              <AppIcon icon="clone" />
              <span>Se asignarán los cartones <strong>{startCard.toLocaleString("es-CO")}</strong> al <strong>{endCard.toLocaleString("es-CO")}</strong></span>
            </div>
          )}
          <p className="form-hint">Un cartón solo puede pertenecer a un usuario. Si el rango se cruza con otro bloque ya asignado, el sistema lo rechazará.</p>
          <div className="modal-actions">
            <AppButton variant="transparent" label="Cancelar" onClick={() => setIsCreateOpen(false)} />
            <AppButton icon="check" label={isSaving ? "Asignando…" : "Asignar"} onClick={handleCreate} disabled={isSaving || !canCreate} />
          </div>
        </div>
      </AppModal>

      <AppModal title="Eliminar asignación" isOpen={Boolean(toDelete)} onClose={() => setToDelete(null)}>
        <div className="delete-confirm">
          <span><AppIcon icon="trash-alt" /></span>
          <h3>¿Liberar los cartones {toDelete?.startCard}–{toDelete?.endCard}?</h3>
          <p>Quedarán disponibles para asignar a otro usuario. Solo se puede si el bloque no tiene cartones registrados.</p>
          <div><AppButton variant="transparent" label="Cancelar" onClick={() => setToDelete(null)} /><AppButton variant="danger" icon="trash-alt" label="Eliminar" onClick={handleDelete} /></div>
        </div>
      </AppModal>

      <AppModal title="Borrar registros del bloque" isOpen={Boolean(toClear)} onClose={() => !isClearing && setToClear(null)}>
        <div className="clear-confirm">
          <span className="warning-mark"><AppIcon icon="triangle-exclamation" /></span>
          <span className="danger-kicker">Acción irreversible</span>
          <h3>¿Borrar {toClear?.registeredCards.toLocaleString("es-CO")} registro(s)?</h3>
          <p>Se eliminarán todos los datos de las personas asociadas a los cartones <strong>{toClear?.startCard.toLocaleString("es-CO")}–{toClear?.endCard.toLocaleString("es-CO")}</strong>, asignados a <strong>{toClear?.userFullName}</strong> en <strong>{toClear?.municipioLabel ?? "municipio pendiente"}</strong>.</p>
          <div className="clear-effects"><span><AppIcon icon="check" /> La asignación y los cartones se conservan</span><span><AppIcon icon="triangle-exclamation" /> Los cartones volverán a estar disponibles para registro</span></div>
          <div className="confirm-actions"><AppButton variant="transparent" label="Cancelar" onClick={() => setToClear(null)} disabled={isClearing} /><AppButton variant="danger" icon="trash-alt" label={isClearing ? "Borrando…" : "Sí, borrar registros"} onClick={handleClearRegistrations} disabled={isClearing} /></div>
        </div>
      </AppModal>
    </AssignmentsPageStyle>
  );
};

export default AssignmentsPage;

const AssignmentsPageStyle = styled.div`
  .module-head { display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; margin-bottom: 1.25rem; }
  .eyebrow { color: var(--color-secondary); font-size: .62rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
  .page-heading { margin: .35rem 0 0; font-size: 1.45rem; }
  .stat-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: .8rem; margin-bottom: 1.25rem; }
  .stat { padding: .9rem 1rem; background: var(--bg-panel); border: 1px solid var(--border-subtle); border-radius: 14px; }
  .stat small { display: block; color: var(--text-muted); font-size: .58rem; letter-spacing: .04em; text-transform: uppercase; }
  .stat strong { display: block; margin-top: .3rem; color: var(--text-primary); font-size: 1.3rem; }
  .stat.accent { background: rgba(var(--color-primary-rgb),.1); border-color: rgba(var(--color-primary-rgb),.25); }
  .stat.accent strong { color: #b7a8ff; }
  .table-card { padding: 1.1rem 1.2rem; }
  .table-scroll { overflow-x: auto; }
  .state-note { display: flex; align-items: center; justify-content: center; gap: .5rem; padding: 2.5rem; color: var(--text-muted); font-size: .74rem; }
  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .user-cell { display: flex; flex-direction: column; }
  .user-cell strong { font-size: .74rem; }
  .user-cell small { margin-top: .15rem; color: #b7a8ff; font-size: .6rem; }
  .range-chip { padding: .32rem .6rem; color: var(--color-accent); background: rgba(255,184,77,.09); border: 1px solid rgba(255,184,77,.2); border-radius: 8px; font-size: .68rem; font-weight: 700; white-space: nowrap; }
  .municipality-select { min-width:145px; padding:.4rem .5rem; color:var(--text-primary); background:var(--bg-soft); border:1px solid var(--border-subtle); border-radius:8px; font-family:"Poppins",sans-serif; font-size:.62rem; outline:0; cursor:pointer; }
  .municipality-select.pending { color:#ffd078; border-color:rgba(255,184,77,.28); }
  .progress-cell { display: flex; min-width: 160px; flex-direction: column; gap: .3rem; }
  .progress-bar { height: 6px; overflow: hidden; background: rgba(255,255,255,.06); border-radius: 99px; }
  .progress-bar span { display: block; height: 100%; background: linear-gradient(90deg, var(--color-primary), var(--color-secondary)); border-radius: inherit; }
  .progress-cell small { color: var(--text-muted); font-size: .58rem; }
  .danger-action .vs-btn { width: 30px; min-height: 30px; color: var(--color-danger); }
  .row-actions { display:flex; align-items:center; gap:.3rem; }
  .clear-action .vs-btn { width:30px; min-height:30px; color:#ffb94f; }
  .clear-action .vs-btn:disabled { opacity:.25; }
  .form-grid { display: flex; flex-direction: column; gap: .9rem; }
  .form-grid label { display: flex; flex-direction: column; gap: .4rem; }
  .form-grid label > span { color: var(--text-muted); font-size: .6rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
  .range-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .8rem; }
  .range-preview { display: flex; align-items: center; gap: .6rem; padding: .8rem .9rem; color: var(--text-secondary); background: rgba(var(--color-primary-rgb),.08); border: 1px solid rgba(var(--color-primary-rgb),.2); border-radius: 11px; font-size: .72rem; }
  .range-preview svg { color: #b7a8ff; }
  .range-preview strong { color: #fff; }
  .form-hint { margin: 0; color: var(--text-muted); font-size: .66rem; line-height: 1.5; }
  .modal-actions { display: flex; justify-content: flex-end; gap: .5rem; padding-top: 1rem; border-top: 1px solid var(--border-subtle); }
  .delete-confirm { text-align: center; }
  .delete-confirm > span { display: grid; width: 48px; height: 48px; margin: 0 auto .9rem; place-items: center; color: #ff788d; background: rgba(var(--color-danger-rgb),.08); border-radius: 14px; }
  .delete-confirm h3 { margin: 0; color: #fff; font-size: .9rem; }
  .delete-confirm p { margin: .4rem 0 1.2rem; color: var(--text-muted); font-size: .68rem; line-height: 1.5; }
  .delete-confirm > div { display: grid; grid-template-columns: 1fr 1fr; gap: .5rem; }
  .delete-confirm .vs-btn { width: 100%; }
  .clear-confirm { text-align:center; }
  .warning-mark { display:grid; width:54px; height:54px; margin:0 auto .7rem; place-items:center; color:#ffbd59; background:rgba(255,184,77,.09); border:1px solid rgba(255,184,77,.2); border-radius:16px; font-size:1.15rem; }
  .danger-kicker { color:#ff8d9f; font-size:.54rem; font-weight:800; letter-spacing:.12em; text-transform:uppercase; }
  .clear-confirm h3 { margin:.42rem 0; color:#fff; font-size:1rem; }
  .clear-confirm>p { margin:0 auto 1rem; max-width:480px; color:var(--text-muted); font-size:.68rem; line-height:1.65; }
  .clear-confirm>p strong { color:var(--text-secondary); }
  .clear-effects { display:flex; flex-direction:column; gap:.42rem; padding:.75rem; color:var(--text-secondary); text-align:left; background:rgba(0,0,0,.14); border:1px solid var(--border-subtle); border-radius:11px; font-size:.62rem; }
  .clear-effects span { display:flex; align-items:center; gap:.45rem; }
  .clear-effects span:first-child svg { color:var(--color-secondary); }
  .clear-effects span:last-child svg { color:#ffbd59; }
  .confirm-actions { display:grid; grid-template-columns:1fr 1.25fr; gap:.5rem; margin-top:1rem; }
  .confirm-actions .vs-btn { width:100%; }
  @media (max-width: 900px) { .stat-row { grid-template-columns: 1fr 1fr; } }
  @media (max-width: 600px) { .module-head { flex-direction: column; align-items: flex-start; } .range-grid { grid-template-columns: 1fr; } }
`;

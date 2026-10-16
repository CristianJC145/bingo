import React, { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import AppButton from "../../../shared/components/Buttons/AppButton";
import AppIcon from "../../../shared/components/AppIcon";
import AppModal from "../../../shared/components/AppModal";
import { ManagedUser, createUser, deleteUser, listUsers, updateUser } from "../services/adminUsers.service";

interface ApiError { response?: { data?: { message?: string } }; }
const errorMessage = (caught: unknown, fallback: string) => (caught as ApiError).response?.data?.message ?? fallback;

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<ManagedUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<ManagedUser | null>(null);

  const [form, setForm] = useState({ username: "", fullName: "", password: "" });
  const [editForm, setEditForm] = useState({ fullName: "", password: "" });
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    try { setUsers(await listUsers()); }
    catch { toast.error("No fue posible cargar los usuarios."); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm({ username: "", fullName: "", password: "" }); setIsCreateOpen(true); };
  const openEdit = (user: ManagedUser) => { setEditForm({ fullName: user.fullName, password: "" }); setUserToEdit(user); };

  const handleCreate = async () => {
    setIsSaving(true);
    try {
      await createUser({ ...form, username: form.username.trim().toLowerCase(), role: "registrador" });
      toast.success("Usuario creado correctamente.");
      setIsCreateOpen(false);
      await load();
    } catch (caught) {
      toast.error(errorMessage(caught, "No fue posible crear el usuario."));
    } finally { setIsSaving(false); }
  };

  const handleEdit = async () => {
    if (!userToEdit) return;
    setIsSaving(true);
    try {
      await updateUser(userToEdit.id, {
        fullName: editForm.fullName.trim(),
        ...(editForm.password ? { password: editForm.password } : {}),
      });
      toast.success("Usuario actualizado.");
      setUserToEdit(null);
      await load();
    } catch (caught) {
      toast.error(errorMessage(caught, "No fue posible actualizar el usuario."));
    } finally { setIsSaving(false); }
  };

  const handleToggleActive = async (user: ManagedUser) => {
    try {
      await updateUser(user.id, { active: !user.active });
      toast.success(user.active ? "Usuario desactivado." : "Usuario activado.");
      await load();
    } catch (caught) {
      toast.error(errorMessage(caught, "No fue posible cambiar el estado."));
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    try {
      await deleteUser(userToDelete.id);
      toast.success("Usuario eliminado.");
      setUserToDelete(null);
      await load();
    } catch (caught) {
      toast.error(errorMessage(caught, "No fue posible eliminar el usuario."));
    }
  };

  const registradores = users.filter((user) => user.role === "registrador");
  const canCreate = form.username.trim().length >= 3 && form.fullName.trim().length >= 3 && form.password.length >= 6;

  return (
    <UsersPageStyle>
      <header className="module-head">
        <div><span className="eyebrow">Administración</span><h1 className="page-heading">Usuarios del sistema</h1></div>
        <AppButton icon="plus" label="Nuevo usuario" onClick={openCreate} />
      </header>

      <div className="stat-row">
        <div className="stat"><small>Registradores</small><strong>{registradores.length}</strong></div>
        <div className="stat"><small>Cartones asignados</small><strong>{users.reduce((sum, user) => sum + user.assignedCards, 0).toLocaleString("es-CO")}</strong></div>
        <div className="stat accent"><small>Cartones registrados</small><strong>{users.reduce((sum, user) => sum + user.registeredCards, 0).toLocaleString("es-CO")}</strong></div>
      </div>

      <section className="table-card surface-card">
        {isLoading ? (
          <div className="state-note"><AppIcon icon="rotate" className="spin" />Cargando usuarios…</div>
        ) : (
          <div className="table-scroll">
            <table className="vs-dataTable">
              <thead><tr><th>Usuario</th><th>Nombre completo</th><th>Rol</th><th>Asignados</th><th>Registrados</th><th>Estado</th><th>Acciones</th></tr></thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td><span className="username">@{user.username}</span></td>
                    <td>{user.fullName}</td>
                    <td><span className={`role-chip ${user.role}`}>{user.role === "admin" ? "Administrador" : "Registrador"}</span></td>
                    <td>{user.assignedCards.toLocaleString("es-CO")}</td>
                    <td>{user.registeredCards.toLocaleString("es-CO")}</td>
                    <td><span className={`status-chip ${user.active ? "on" : "off"}`}>{user.active ? "Activo" : "Inactivo"}</span></td>
                    <td>
                      <div className="row-actions">
                        <AppButton icon="edit" variant="light" onClick={() => openEdit(user)} ariaLabel={`Editar ${user.fullName}`} />
                        {user.role !== "admin" && (
                          <>
                            <AppButton icon={user.active ? "lock" : "check"} variant="transparent" onClick={() => handleToggleActive(user)} ariaLabel={user.active ? "Desactivar" : "Activar"} />
                            <AppButton icon="trash-alt" variant="transparent" className="danger-action" onClick={() => setUserToDelete(user)} ariaLabel={`Eliminar ${user.fullName}`} />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <AppModal title="Nuevo usuario" isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)}>
        <div className="form-grid">
          <label><span>Nombre completo</span><input className="form-input" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} placeholder="Ej. María Gómez" /></label>
          <label><span>Usuario</span><input className="form-input" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} placeholder="maria.gomez" /><small>Solo letras, números, punto, guion o guion bajo.</small></label>
          <label><span>Contraseña</span><input className="form-input" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Mínimo 6 caracteres" /></label>
          <div className="modal-actions">
            <AppButton variant="transparent" label="Cancelar" onClick={() => setIsCreateOpen(false)} />
            <AppButton icon="check" label={isSaving ? "Creando…" : "Crear usuario"} onClick={handleCreate} disabled={isSaving || !canCreate} />
          </div>
        </div>
      </AppModal>

      <AppModal title="Editar usuario" isOpen={Boolean(userToEdit)} onClose={() => setUserToEdit(null)}>
        <div className="form-grid">
          <label><span>Nombre completo</span><input className="form-input" value={editForm.fullName} onChange={(event) => setEditForm({ ...editForm, fullName: event.target.value })} /></label>
          <label><span>Nueva contraseña</span><input className="form-input" type="password" value={editForm.password} onChange={(event) => setEditForm({ ...editForm, password: event.target.value })} placeholder="Déjala vacía para no cambiarla" /></label>
          <div className="modal-actions">
            <AppButton variant="transparent" label="Cancelar" onClick={() => setUserToEdit(null)} />
            <AppButton icon="check" label={isSaving ? "Guardando…" : "Guardar cambios"} onClick={handleEdit} disabled={isSaving} />
          </div>
        </div>
      </AppModal>

      <AppModal title="Eliminar usuario" isOpen={Boolean(userToDelete)} onClose={() => setUserToDelete(null)}>
        <div className="delete-confirm">
          <span><AppIcon icon="trash-alt" /></span>
          <h3>¿Eliminar a “{userToDelete?.fullName}”?</h3>
          <p>Se eliminarán también sus bloques de cartones asignados. Esta acción no se puede deshacer.</p>
          <div><AppButton variant="transparent" label="Cancelar" onClick={() => setUserToDelete(null)} /><AppButton variant="danger" icon="trash-alt" label="Eliminar" onClick={handleDelete} /></div>
        </div>
      </AppModal>
    </UsersPageStyle>
  );
};

export default UsersPage;

const UsersPageStyle = styled.div`
  .module-head { display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; margin-bottom: 1.25rem; }
  .eyebrow { color: var(--color-secondary); font-size: .62rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
  .page-heading { margin: .35rem 0 0; font-size: 1.45rem; }
  .stat-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: .8rem; margin-bottom: 1.25rem; }
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
  .username { color: #b7a8ff; font-size: .72rem; font-weight: 600; }
  .role-chip { padding: .3rem .55rem; border-radius: 7px; font-size: .58rem; font-weight: 700; }
  .role-chip.admin { color: var(--color-accent); background: rgba(255,184,77,.1); }
  .role-chip.registrador { color: var(--color-secondary); background: rgba(var(--color-secondary-rgb),.1); }
  .status-chip { padding: .3rem .55rem; border-radius: 7px; font-size: .58rem; font-weight: 700; }
  .status-chip.on { color: var(--color-secondary); background: rgba(var(--color-secondary-rgb),.1); }
  .status-chip.off { color: var(--text-muted); background: rgba(255,255,255,.05); }
  .row-actions { display: flex; gap: .3rem; }
  .row-actions .vs-btn { width: 30px; min-height: 30px; }
  .danger-action .vs-btn { color: var(--color-danger); }
  .form-grid { display: flex; flex-direction: column; gap: .9rem; }
  .form-grid label { display: flex; flex-direction: column; gap: .4rem; }
  .form-grid label > span { color: var(--text-muted); font-size: .6rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
  .form-grid label > small { color: var(--text-muted); font-size: .58rem; }
  .modal-actions { display: flex; justify-content: flex-end; gap: .5rem; margin-top: .5rem; padding-top: 1rem; border-top: 1px solid var(--border-subtle); }
  .delete-confirm { text-align: center; }
  .delete-confirm > span { display: grid; width: 48px; height: 48px; margin: 0 auto .9rem; place-items: center; color: #ff788d; background: rgba(var(--color-danger-rgb),.08); border-radius: 14px; }
  .delete-confirm h3 { margin: 0; color: #fff; font-size: .9rem; }
  .delete-confirm p { margin: .4rem 0 1.2rem; color: var(--text-muted); font-size: .68rem; line-height: 1.5; }
  .delete-confirm > div { display: grid; grid-template-columns: 1fr 1fr; gap: .5rem; }
  .delete-confirm .vs-btn { width: 100%; }
  @media (max-width: 700px) { .stat-row { grid-template-columns: 1fr; } .module-head { flex-direction: column; align-items: flex-start; } }
`;

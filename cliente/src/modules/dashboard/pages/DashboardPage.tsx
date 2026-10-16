import React, { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import AppIcon from "../../../shared/components/AppIcon";
import AppButton from "../../../shared/components/Buttons/AppButton";
import BarChart, { BarDatum } from "../components/BarChart";
import ShareBar from "../components/ShareBar";
import { DashboardData, fetchDashboard } from "../services/dashboard.service";
import { Catalogs, fetchCatalogs } from "../../auth/services/auth.service";

const compact = (value: number) =>
  value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}M`
    : value >= 10_000 ? `${(value / 1_000).toFixed(1)}K`
      : value.toLocaleString("es-CO");

const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [dashboard, catalogList] = await Promise.all([fetchDashboard(), fetchCatalogs()]);
      setData(dashboard);
      setCatalogs(catalogList);
    } catch {
      toast.error("No fue posible cargar el resumen.");
    } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const labelFor = useMemo(() => {
    const maps = catalogs && {
      municipios: new Map(catalogs.municipios.map((option) => [option.value, option.label])),
      sectores: new Map(catalogs.sectores.map((option) => [option.value, option.label])),
      generos: new Map(catalogs.generos.map((option) => [option.value, option.label])),
      tiposDiscapacidad: new Map(catalogs.tiposDiscapacidad.map((option) => [option.value, option.label])),
      siNo: new Map(catalogs.siNo.map((option) => [option.value, option.label])),
    };
    return (group: keyof NonNullable<typeof maps>, value: string) => maps?.[group].get(value) ?? value;
  }, [catalogs]);

  if (isLoading) {
    return <DashboardStyle><div className="state-note"><AppIcon icon="rotate" className="spin" />Cargando resumen…</div></DashboardStyle>;
  }

  if (!data) {
    return <DashboardStyle><div className="state-note">No hay información disponible.</div></DashboardStyle>;
  }

  const { totals } = data;
  const progressPercent = totals.assigned > 0 ? Math.round((totals.registered / totals.assigned) * 100) : 0;

  const municipioData: BarDatum[] = data.byMunicipio.map((item) => ({ label: labelFor("municipios", item.value), value: item.total }));
  const discapacidadData: BarDatum[] = data.byDiscapacidad.map((item) => ({ label: labelFor("tiposDiscapacidad", item.value), value: item.total }));
  const sectorData = data.bySector.map((item) => ({ label: labelFor("sectores", item.value), value: item.total }));
  const generoData = data.byGenero.map((item) => ({ label: labelFor("generos", item.value), value: item.total }));
  const desplazadoData = data.byDesplazado.map((item) => ({ label: labelFor("siNo", item.value), value: item.total }));
  const userData: BarDatum[] = data.byUser.map((item) => ({ label: item.fullName, value: item.registered }));

  return (
    <DashboardStyle>
      <header className="module-head">
        <div><span className="eyebrow">Resumen general</span><h1 className="page-heading">Dashboard de cartones</h1></div>
        <AppButton variant="light" icon="rotate" label="Actualizar" onClick={load} />
      </header>

      <section className="hero-row">
        <div className="hero-card surface-card">
          <span className="hero-label">Cartones registrados</span>
          <strong className="hero-figure">{compact(totals.registered)}</strong>
          <div className="hero-meter" role="img" aria-label={`${progressPercent}% de los cartones asignados ya fueron registrados`}>
            <span style={{ width: `${progressPercent}%` }} />
          </div>
          <small className="hero-foot">{progressPercent}% de {totals.assigned.toLocaleString("es-CO")} cartones asignados</small>
        </div>

        <div className="tile-grid">
          <div className="stat-tile surface-card"><small>Inventario en base</small><strong>{totals.inventory.toLocaleString("es-CO")}</strong></div>
          <div className="stat-tile surface-card"><small>Asignados</small><strong>{totals.assigned.toLocaleString("es-CO")}</strong></div>
          <div className="stat-tile surface-card"><small>Por registrar</small><strong>{totals.available.toLocaleString("es-CO")}</strong></div>
          <div className="stat-tile surface-card"><small>Registradores activos</small><strong>{totals.activeRegistrars.toLocaleString("es-CO")}</strong></div>
        </div>
      </section>

      <section className="chart-grid">
        <article className="chart-card surface-card wide">
          <div className="chart-head"><h2>Registros por municipio</h2><span className="chart-sub">Cartones entregados en cada municipio del Putumayo</span></div>
          <BarChart data={municipioData} totalForShare={totals.registered} emptyLabel="Todavía no hay cartones registrados." />
        </article>

        <article className="chart-card surface-card">
          <div className="chart-head"><h2>Avance por registrador</h2><span className="chart-sub">Cartones registrados por cada usuario</span></div>
          <BarChart data={userData} totalForShare={totals.registered} emptyLabel="Aún no hay registradores con avance." />
        </article>

        <article className="chart-card surface-card">
          <div className="chart-head"><h2>Distribución por sector</h2><span className="chart-sub">Urbano frente a rural</span></div>
          <ShareBar data={sectorData} />
        </article>

        <article className="chart-card surface-card">
          <div className="chart-head"><h2>Distribución por género</h2><span className="chart-sub">Personas registradas</span></div>
          <ShareBar data={generoData} />
        </article>

        <article className="chart-card surface-card">
          <div className="chart-head"><h2>Población desplazada</h2><span className="chart-sub">Personas registradas como desplazadas</span></div>
          <ShareBar data={desplazadoData} />
        </article>

        <article className="chart-card surface-card wide">
          <div className="chart-head"><h2>Tipo de discapacidad</h2><span className="chart-sub">Solo personas registradas con discapacidad</span></div>
          <BarChart data={discapacidadData} emptyLabel="No hay registros con discapacidad." />
        </article>
      </section>
    </DashboardStyle>
  );
};

export default DashboardPage;

const DashboardStyle = styled.div`
  .module-head { display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; margin-bottom: 1.25rem; }
  .eyebrow { color: var(--color-secondary); font-size: .62rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
  .page-heading { margin: .35rem 0 0; font-size: 1.45rem; }
  .state-note { display: flex; align-items: center; justify-content: center; gap: .5rem; min-height: 300px; color: var(--text-muted); font-size: .78rem; }
  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .hero-row { display: grid; grid-template-columns: minmax(260px, .85fr) minmax(0, 1.15fr); gap: 1rem; margin-bottom: 1rem; }
  .hero-card { display: flex; flex-direction: column; padding: 1.3rem 1.4rem; }
  .hero-label { color: var(--text-muted); font-size: .62rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
  /* Una sola cifra héroe por vista, ≥48px, en la misma tipografía del sistema. */
  .hero-figure { margin: .5rem 0 .9rem; color: var(--text-primary); font-family: "Poppins", sans-serif; font-size: 3rem; font-weight: 700; line-height: 1; }
  .hero-meter { height: 8px; overflow: hidden; background: rgba(124,92,255,.16); border-radius: 99px; }
  .hero-meter span { display: block; height: 100%; background: #7c5cff; border-radius: inherit; transition: width .4s ease; }
  .hero-foot { margin-top: .6rem; color: var(--text-secondary); font-size: .68rem; }

  .tile-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
  .stat-tile { display: flex; flex-direction: column; justify-content: center; padding: 1rem 1.15rem; }
  .stat-tile small { color: var(--text-muted); font-size: .6rem; letter-spacing: .05em; text-transform: uppercase; }
  .stat-tile strong { margin-top: .35rem; color: var(--text-primary); font-size: 1.5rem; font-weight: 600; }

  .chart-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
  .chart-card { padding: 1.2rem 1.3rem; }
  .chart-card.wide { grid-column: span 2; }
  .chart-head { margin-bottom: 1.1rem; }
  .chart-head h2 { margin: 0; color: var(--text-primary); font-size: .92rem; font-weight: 600; }
  .chart-sub { display: block; margin-top: .25rem; color: var(--text-muted); font-size: .66rem; }

  @media (max-width: 1000px) {
    .hero-row { grid-template-columns: 1fr; }
    .chart-grid { grid-template-columns: 1fr; }
    .chart-card.wide { grid-column: span 1; }
  }
  @media (max-width: 560px) {
    .tile-grid { grid-template-columns: 1fr 1fr; }
    .module-head { flex-direction: column; align-items: flex-start; }
  }
`;

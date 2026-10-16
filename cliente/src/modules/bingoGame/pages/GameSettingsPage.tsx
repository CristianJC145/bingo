import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import AppButton from "../../../shared/components/Buttons/AppButton";
import AppIcon from "../../../shared/components/AppIcon";
import { ACTIVE_VOICE_KEY, BallVoice, DEFAULT_VOICE_ID, listBallVoices, REPEAT_VOICE_KEY } from "../../bingoCustomization/services/ballVoices.service";
import { DEFAULT_GAME_SETTINGS, GameSettings, getGameSettings, saveGameSettings, WITHOUT_DISABILITY_VALUE } from "../services/gameSettings.service";
import { CatalogOption, fetchCatalogs } from "../../auth/services/auth.service";

const DEFAULT_VOICE: BallVoice = { id: DEFAULT_VOICE_ID, name: "Voz original", extension: ".wav", ballCount: 75, createdAt: "" };
const CAREGIVER_OPTIONS: CatalogOption[] = [{ value: "SI", label: "Persona cuidadora" }, { value: "NO", label: "No cuidadora" }];
interface VoiceSettings { narratorVoiceId: string; repeatVoiceId: string; }
const DEFAULT_VOICE_SETTINGS: VoiceSettings = { narratorVoiceId: DEFAULT_VOICE_ID, repeatVoiceId: DEFAULT_VOICE_ID };

interface BaseSetting { icon: string; title: string; description: string; }
interface NumericSetting extends BaseSetting {
  kind: "number";
  key: "winnerRepeatThreshold" | "figureShowcaseSeconds";
  unit: string;
  min: number;
  max: number;
  step: number;
  hint: (value: number) => string;
}
interface ToggleSetting extends BaseSetting {
  kind: "toggle";
  key: "registeredCardsOnly" | "automaticBallRepeat";
  hint: (value: boolean) => string;
}
type Setting = NumericSetting | ToggleSetting;

const sameSelection = (left: string[], right: string[]) =>
  left.length === right.length && left.every((value) => right.includes(value));

/** Cada sección agrupa ajustes afines; añadir opciones nuevas es sumar entradas aquí. */
const SECTIONS: { title: string; caption: string; settings: Setting[] }[] = [
  {
    title: "Transmisión",
    caption: "Cómo se ve la partida para el público en OBS.",
    settings: [
      {
        kind: "number",
        key: "figureShowcaseSeconds",
        icon: "vector-square",
        title: "Presentación de la figura",
        description: "Al elegir la figura de la ronda, se muestra en grande sobre la transmisión para que el público entienda cómo se juega.",
        unit: "segundos",
        min: 2,
        max: 60,
        step: 1,
        hint: (value) => `La figura permanece ${value} segundos en pantalla y luego desaparece sola.`,
      },
    ],
  },
  {
    title: "Audio de la partida",
    caption: "Controla cómo se anuncian las balotas durante cada ronda.",
    settings: [
      {
        kind: "toggle",
        key: "automaticBallRepeat",
        icon: "rotate",
        title: "Repetición automática de balotas",
        description: "Al terminar el canto principal, la última balota se anuncia una segunda vez con la voz de repetición elegida.",
        hint: (value) => value
          ? "Modo automático: cada balota se canta dos veces antes de continuar."
          : "Modo manual: usa el botón de repetir únicamente cuando lo necesites.",
      },
    ],
  },
  {
    title: "Reglas de partida",
    caption: "Condiciones que se evalúan durante el juego.",
    settings: [
      {
        kind: "toggle",
        key: "registeredCardsOnly",
        icon: "list",
        title: "Jugar solo con cartones registrados",
        description: "Únicamente compiten los cartones que un registrador vinculó a una persona. Los cartones vendidos sin registrar quedan fuera aunque estén dentro del rango elegido.",
        hint: (value) => value
          ? "Un cartón sin registro no puede ganar, aunque complete la figura."
          : "Compiten todos los cartones del rango, estén registrados o no.",
      },
      {
        kind: "number",
        key: "winnerRepeatThreshold",
        icon: "trophy",
        title: "Repetir la partida",
        description: "Cuando los cartones ganadores superan este número, la transmisión anuncia que la partida se repite.",
        unit: "ganadores",
        min: 1,
        max: 500,
        step: 1,
        hint: (value) => `Con ${value + 1} ganadores o más se anuncia la repetición.`,
      },
    ],
  },
];

const GameSettingsPage: React.FC = () => {
  const [saved, setSaved] = useState<GameSettings>(DEFAULT_GAME_SETTINGS);
  const [form, setForm] = useState<GameSettings>(DEFAULT_GAME_SETTINGS);
  const [voices, setVoices] = useState<BallVoice[]>([DEFAULT_VOICE]);
  const [savedVoices, setSavedVoices] = useState<VoiceSettings>(DEFAULT_VOICE_SETTINGS);
  const [voiceForm, setVoiceForm] = useState<VoiceSettings>(DEFAULT_VOICE_SETTINGS);
  const [municipalities, setMunicipalities] = useState<CatalogOption[]>([]);
  const [disabilities, setDisabilities] = useState<CatalogOption[]>([]);
  const [expandedFilter, setExpandedFilter] = useState<"municipalities" | "disabilities" | "caregivers" | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    Promise.all([getGameSettings(), listBallVoices().catch(() => []), fetchCatalogs()])
      .then(([data, storedVoices, catalogs]) => {
        setSaved(data);
        setForm(data);
        const completeVoices = [DEFAULT_VOICE, ...storedVoices.filter((voice) => voice.ballCount >= 75)];
        const availableIds = new Set(completeVoices.map((voice) => voice.id));
        const storedNarrator = localStorage.getItem(ACTIVE_VOICE_KEY) ?? DEFAULT_VOICE_ID;
        const narratorVoiceId = availableIds.has(storedNarrator) ? storedNarrator : DEFAULT_VOICE_ID;
        const storedRepeat = localStorage.getItem(REPEAT_VOICE_KEY) ?? narratorVoiceId;
        const repeatVoiceId = availableIds.has(storedRepeat) ? storedRepeat : DEFAULT_VOICE_ID;
        const voiceSettings = { narratorVoiceId, repeatVoiceId };
        setVoices(completeVoices);
        setSavedVoices(voiceSettings);
        setVoiceForm(voiceSettings);
        setMunicipalities(catalogs.municipios);
        setDisabilities([{ value: WITHOUT_DISABILITY_VALUE, label: "Sin discapacidad" }, ...catalogs.tiposDiscapacidad]);
      })
      .catch(() => toast.error("No fue posible cargar la configuración."))
      .finally(() => setIsLoading(false));
  }, []);

  const allSettings = useMemo(() => SECTIONS.flatMap((section) => section.settings), []);
  const isDirty = allSettings.some((setting) => form[setting.key] !== saved[setting.key])
    || !sameSelection(form.activeMunicipalities, saved.activeMunicipalities)
    || !sameSelection(form.activeDisabilities, saved.activeDisabilities)
    || !sameSelection(form.activeCaregiverStatuses, saved.activeCaregiverStatuses)
    || voiceForm.narratorVoiceId !== savedVoices.narratorVoiceId
    || voiceForm.repeatVoiceId !== savedVoices.repeatVoiceId;
  const isValid = form.activeMunicipalities.length > 0 && form.activeDisabilities.length > 0 && form.activeCaregiverStatuses.length > 0 && allSettings.every((setting) => {
    if (setting.kind === "toggle") return true;
    const value = form[setting.key];
    return Number.isInteger(value) && value >= setting.min && value <= setting.max;
  });

  /** El ternario separa las dos firmas de `hint`, que no comparten tipo de argumento. */
  const hintFor = (setting: Setting): string =>
    setting.kind === "toggle" ? setting.hint(form[setting.key]) : setting.hint(form[setting.key]);

  const change = (setting: NumericSetting, value: number) => {
    const clamped = Math.min(setting.max, Math.max(setting.min, value));
    setForm((current) => ({ ...current, [setting.key]: clamped }));
  };

  const toggleMunicipality = (value: string) => {
    setForm((current) => ({
      ...current,
      activeMunicipalities: current.activeMunicipalities.includes(value)
        ? current.activeMunicipalities.filter((item) => item !== value)
        : [...current.activeMunicipalities, value],
    }));
  };

  const toggleDisability = (value: string) => {
    setForm((current) => ({
      ...current,
      activeDisabilities: current.activeDisabilities.includes(value)
        ? current.activeDisabilities.filter((item) => item !== value)
        : [...current.activeDisabilities, value],
    }));
  };

  const toggleCaregiver = (value: string) => {
    setForm((current) => ({
      ...current,
      activeCaregiverStatuses: current.activeCaregiverStatuses.includes(value)
        ? current.activeCaregiverStatuses.filter((item) => item !== value)
        : [...current.activeCaregiverStatuses, value],
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await saveGameSettings(form);
      localStorage.setItem(ACTIVE_VOICE_KEY, voiceForm.narratorVoiceId);
      localStorage.setItem(REPEAT_VOICE_KEY, voiceForm.repeatVoiceId);
      setSaved(updated);
      setForm(updated);
      setSavedVoices(voiceForm);
      toast.success("Configuración guardada.");
    } catch {
      toast.error("No fue posible guardar la configuración.");
    } finally { setIsSaving(false); }
  };

  return (
    <GameSettingsPageStyle>
      <header className="module-head">
        <div>
          <span className="eyebrow">Juego</span>
          <h1 className="page-heading">Configuración de la partida</h1>
          <p className="page-caption">Ajustes que se aplican a todas las rondas y se reflejan en la transmisión al instante.</p>
        </div>
        <div className="head-actions">
          {isDirty && <span className="dirty-note"><AppIcon icon="circle" /> Cambios sin guardar</span>}
          <AppButton icon="check" label={isSaving ? "Guardando…" : "Guardar cambios"} onClick={handleSave} disabled={!isDirty || !isValid || isSaving || isLoading} />
        </div>
      </header>

      {isLoading ? (
        <div className="state-note"><AppIcon icon="rotate" className="spin" /><span>Cargando configuración…</span></div>
      ) : (
        SECTIONS.map((section) => (
          <section className="settings-block" key={section.title}>
            <div className="block-head">
              <h2>{section.title}</h2>
              <p>{section.caption}</p>
            </div>

            <div className="settings-list">
              {section.settings.map((setting) => (
                <article className={`setting-row surface-card ${setting.kind === "toggle" && form[setting.key] ? "is-on" : ""}`} key={setting.key}>
                  <span className="setting-icon"><AppIcon icon={setting.icon as never} /></span>
                  <div className="setting-copy">
                    <strong>{setting.title}</strong>
                    <p>{setting.description}</p>
                    <small>{hintFor(setting)}</small>
                  </div>

                  {setting.kind === "toggle" ? (
                    <button
                      type="button"
                      className={`setting-switch ${form[setting.key] ? "on" : ""}`}
                      onClick={() => setForm((current) => ({ ...current, [setting.key]: !current[setting.key] }))}
                      role="switch"
                      aria-checked={form[setting.key]}
                      aria-label={setting.title}
                    >
                      <i />
                      <em>{form[setting.key] ? "Activo" : "Inactivo"}</em>
                    </button>
                  ) : (
                    <div className="setting-control">
                      <button type="button" onClick={() => change(setting, form[setting.key] - setting.step)} disabled={form[setting.key] <= setting.min} aria-label="Disminuir"><AppIcon icon="minus" /></button>
                      <label>
                        <input
                          type="number"
                          min={setting.min}
                          max={setting.max}
                          value={form[setting.key]}
                          onChange={(event) => setForm((current) => ({ ...current, [setting.key]: Number(event.target.value) }))}
                          onBlur={(event) => change(setting, Number(event.target.value) || setting.min)}
                        />
                        <span>{setting.unit}</span>
                      </label>
                      <button type="button" onClick={() => change(setting, form[setting.key] + setting.step)} disabled={form[setting.key] >= setting.max} aria-label="Aumentar"><AppIcon icon="plus" /></button>
                    </div>
                  )}
                </article>
              ))}
              {section.title === "Reglas de partida" && (
                <div className="participant-filters surface-card">
                  <div className="filters-title">
                    <span><AppIcon icon="sliders" /></span>
                    <div><strong>Filtros de participación</strong><p>Limita quién compite sin llenar la pantalla de controles.</p></div>
                    {(form.activeMunicipalities.length < municipalities.length || form.activeDisabilities.length < disabilities.length || form.activeCaregiverStatuses.length < CAREGIVER_OPTIONS.length) && <em>Filtro activo</em>}
                  </div>

                  <article className={`compact-filter ${expandedFilter === "municipalities" ? "is-open" : ""} ${form.activeMunicipalities.length < municipalities.length ? "is-filtered" : ""}`}>
                    <button type="button" className="filter-summary" onClick={() => setExpandedFilter((current) => current === "municipalities" ? null : "municipalities")} aria-expanded={expandedFilter === "municipalities"}>
                      <span className="filter-icon"><AppIcon icon="landmark" /></span>
                      <span><strong>Municipios</strong><small>{form.activeMunicipalities.length === municipalities.length ? "Todos participan" : `${form.activeMunicipalities.length} de ${municipalities.length} activos`}</small></span>
                      <b>{form.activeMunicipalities.length === 0 ? "Requiere selección" : `${form.activeMunicipalities.length}/${municipalities.length}`}</b>
                      <AppIcon icon={expandedFilter === "municipalities" ? "angle-up" : "angle-down"} />
                    </button>
                    {expandedFilter === "municipalities" && (
                      <div className="filter-body">
                        <div className="filter-actions"><span>Selecciona los municipios que podrán jugar.</span><div><button type="button" onClick={() => setForm((current) => ({ ...current, activeMunicipalities: municipalities.map((item) => item.value) }))}>Todos</button><button type="button" onClick={() => setForm((current) => ({ ...current, activeMunicipalities: [] }))}>Ninguno</button></div></div>
                        <div className="filter-grid municipality-grid">
                          {municipalities.map((item) => {
                            const active = form.activeMunicipalities.includes(item.value);
                            return <button type="button" className={active ? "active" : ""} onClick={() => toggleMunicipality(item.value)} aria-pressed={active} key={item.value}><span>{active && <AppIcon icon="check" />}</span><strong>{item.label}</strong></button>;
                          })}
                        </div>
                      </div>
                    )}
                  </article>

                  <article className={`compact-filter ${expandedFilter === "disabilities" ? "is-open" : ""} ${form.activeDisabilities.length < disabilities.length ? "is-filtered" : ""}`}>
                    <button type="button" className="filter-summary" onClick={() => setExpandedFilter((current) => current === "disabilities" ? null : "disabilities")} aria-expanded={expandedFilter === "disabilities"}>
                      <span className="filter-icon"><AppIcon icon="users" /></span>
                      <span><strong>Condición de discapacidad</strong><small>{form.activeDisabilities.length === disabilities.length ? "Todas las condiciones participan" : `${form.activeDisabilities.length} de ${disabilities.length} activas`}</small></span>
                      <b>{form.activeDisabilities.length === 0 ? "Requiere selección" : `${form.activeDisabilities.length}/${disabilities.length}`}</b>
                      <AppIcon icon={expandedFilter === "disabilities" ? "angle-up" : "angle-down"} />
                    </button>
                    {expandedFilter === "disabilities" && (
                      <div className="filter-body">
                        <div className="filter-actions"><span>Incluye una o varias condiciones. “Sin discapacidad” se controla por separado.</span><div><button type="button" onClick={() => setForm((current) => ({ ...current, activeDisabilities: disabilities.map((item) => item.value) }))}>Todas</button><button type="button" onClick={() => setForm((current) => ({ ...current, activeDisabilities: [] }))}>Ninguna</button></div></div>
                        <div className="filter-grid disability-grid">
                          {disabilities.map((item) => {
                            const active = form.activeDisabilities.includes(item.value);
                            return <button type="button" className={active ? "active" : ""} onClick={() => toggleDisability(item.value)} aria-pressed={active} key={item.value}><span>{active && <AppIcon icon="check" />}</span><strong>{item.label}</strong></button>;
                          })}
                        </div>
                      </div>
                    )}
                  </article>

                  <article className={`compact-filter ${expandedFilter === "caregivers" ? "is-open" : ""} ${form.activeCaregiverStatuses.length < CAREGIVER_OPTIONS.length ? "is-filtered" : ""}`}>
                    <button type="button" className="filter-summary" onClick={() => setExpandedFilter((current) => current === "caregivers" ? null : "caregivers")} aria-expanded={expandedFilter === "caregivers"}>
                      <span className="filter-icon"><AppIcon icon="user" /></span>
                      <span><strong>Condición de cuidador</strong><small>{form.activeCaregiverStatuses.length === CAREGIVER_OPTIONS.length ? "Personas cuidadoras y no cuidadoras participan" : form.activeCaregiverStatuses.length === 1 ? CAREGIVER_OPTIONS.find((item) => item.value === form.activeCaregiverStatuses[0])?.label : "Sin condición seleccionada"}</small></span>
                      <b>{form.activeCaregiverStatuses.length === 0 ? "Requiere selección" : `${form.activeCaregiverStatuses.length}/${CAREGIVER_OPTIONS.length}`}</b>
                      <AppIcon icon={expandedFilter === "caregivers" ? "angle-up" : "angle-down"} />
                    </button>
                    {expandedFilter === "caregivers" && (
                      <div className="filter-body">
                        <div className="filter-actions"><span>Define si participan personas cuidadoras, no cuidadoras o ambas.</span><div><button type="button" onClick={() => setForm((current) => ({ ...current, activeCaregiverStatuses: CAREGIVER_OPTIONS.map((item) => item.value) }))}>Ambas</button><button type="button" onClick={() => setForm((current) => ({ ...current, activeCaregiverStatuses: [] }))}>Ninguna</button></div></div>
                        <div className="filter-grid caregiver-grid">
                          {CAREGIVER_OPTIONS.map((item) => {
                            const active = form.activeCaregiverStatuses.includes(item.value);
                            return <button type="button" className={active ? "active" : ""} onClick={() => toggleCaregiver(item.value)} aria-pressed={active} key={item.value}><span>{active && <AppIcon icon="check" />}</span><strong>{item.label}</strong></button>;
                          })}
                        </div>
                      </div>
                    )}
                  </article>

                  {(form.activeMunicipalities.length < municipalities.length || form.activeDisabilities.length < disabilities.length || form.activeCaregiverStatuses.length < CAREGIVER_OPTIONS.length) && (
                    <div className="filter-note"><AppIcon icon="circle-check" /><span>Cuando un filtro está activo, solo compiten cartones registrados que cumplen todas las condiciones seleccionadas.</span></div>
                  )}
                </div>
              )}
            </div>
          </section>
        )).concat(
          <section className="settings-block" key="voice-settings">
            <div className="block-head"><h2>Voces de las balotas</h2><p>Voces utilizadas al cantar y repetir una balota.</p></div>
            <article className="setting-row voice-setting surface-card">
              <span className="setting-icon"><AppIcon icon="bell" /></span>
              <div className="setting-copy"><strong>Narración de balotas</strong><p>Define una vez la voz principal de la partida y la voz auxiliar del botón para repetir.</p><small>Solo aparecen voces que contienen las 75 balotas.</small></div>
              <div className="voice-controls">
                <label><span>Narrador principal</span><select value={voiceForm.narratorVoiceId} onChange={(event) => setVoiceForm((current) => ({ ...current, narratorVoiceId: event.target.value }))}>{voices.map((voice) => <option value={voice.id} key={voice.id}>{voice.name}</option>)}</select></label>
                <label><span>Repetir balota con</span><select value={voiceForm.repeatVoiceId} onChange={(event) => setVoiceForm((current) => ({ ...current, repeatVoiceId: event.target.value }))}>{voices.map((voice) => <option value={voice.id} key={voice.id}>{voice.name}</option>)}</select></label>
              </div>
            </article>
          </section>
        )
      )}
    </GameSettingsPageStyle>
  );
};

export default GameSettingsPage;

const GameSettingsPageStyle = styled.div`
  .module-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 1.5rem; margin-bottom: 1.6rem; }
  .eyebrow { color: var(--color-secondary); font-size: .62rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
  .page-heading { margin: .35rem 0 0; font-size: 1.45rem; }
  .page-caption { max-width: 52ch; margin: .45rem 0 0; color: var(--text-muted); font-size: .74rem; }
  .head-actions { display: flex; flex: 0 0 auto; align-items: center; gap: .8rem; }
  .dirty-note { display: flex; align-items: center; gap: .4rem; color: var(--color-accent); font-size: .64rem; font-weight: 600; }
  .dirty-note svg { font-size: .4rem; }

  .state-note { display: flex; align-items: center; justify-content: center; gap: .5rem; padding: 3rem; color: var(--text-muted); font-size: .74rem; }
  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .settings-block + .settings-block { margin-top: 1.75rem; }
  .block-head { margin-bottom: .8rem; padding-left: .15rem; }
  .block-head h2 { margin: 0; font-size: .88rem; font-weight: 600; }
  .block-head p { margin: .25rem 0 0; color: var(--text-muted); font-size: .68rem; }

  .settings-list { display: flex; flex-direction: column; gap: .7rem; }
  .setting-row { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.15rem; }
  .setting-icon {
    display: grid;
    width: 38px;
    height: 38px;
    flex: 0 0 38px;
    place-items: center;
    color: #b7a8ff;
    background: rgba(var(--color-primary-rgb), .1);
    border: 1px solid rgba(var(--color-primary-rgb), .2);
    border-radius: 11px;
    font-size: .82rem;
  }
  .setting-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; }
  .setting-copy strong { font-size: .8rem; font-weight: 600; }
  .setting-copy p { margin: .3rem 0 0; max-width: 62ch; color: var(--text-muted); font-size: .68rem; line-height: 1.5; }
  .setting-copy small { margin-top: .4rem; color: var(--color-secondary); font-size: .6rem; }

  .voice-setting { align-items:center; }
  .voice-controls { display:grid; width:min(440px,42%); flex:0 0 auto; grid-template-columns:1fr 1fr; gap:.65rem; }
  .voice-controls label { display:flex; min-width:0; flex-direction:column; gap:.35rem; }
  .voice-controls label>span { color:var(--text-muted); font-size:.55rem; font-weight:700; letter-spacing:.06em; text-transform:uppercase; }
  .voice-controls select { width:100%; min-width:0; padding:.68rem .75rem; color:var(--text-primary); background:var(--bg-soft); border:1px solid var(--border-subtle); border-radius:10px; outline:0; font-family:"Poppins",sans-serif; font-size:.66rem; cursor:pointer; }
  .voice-controls select:focus { border-color:rgba(var(--color-primary-rgb),.55); box-shadow:0 0 0 3px rgba(var(--color-primary-rgb),.07); }

  .participant-filters { overflow:hidden; padding:.45rem; }
  .filters-title { display:flex; align-items:center; gap:.7rem; padding:.5rem .65rem .65rem; }
  .filters-title>span { display:grid; width:30px; height:30px; flex:0 0 30px; place-items:center; color:#b7a8ff; background:rgba(var(--color-primary-rgb),.1); border-radius:9px; font-size:.65rem; }
  .filters-title>div { display:flex; min-width:0; flex:1; flex-direction:column; }
  .filters-title strong { font-size:.72rem; }
  .filters-title p { margin:.12rem 0 0; color:var(--text-muted); font-size:.58rem; }
  .filters-title em { padding:.3rem .48rem; color:#ffd078; background:rgba(255,184,77,.08); border:1px solid rgba(255,184,77,.18); border-radius:7px; font-size:.5rem; font-style:normal; font-weight:700; text-transform:uppercase; }
  .compact-filter { overflow:hidden; background:rgba(0,0,0,.13); border:1px solid var(--border-subtle); border-radius:11px; transition:border-color .18s ease; }
  .compact-filter+.compact-filter { margin-top:.38rem; }
  .compact-filter.is-filtered { border-color:rgba(255,184,77,.25); }
  .filter-summary { display:grid; width:100%; grid-template-columns:30px minmax(0,1fr) auto 12px; align-items:center; gap:.65rem; padding:.58rem .7rem; color:var(--text-primary); text-align:left; background:transparent; border:0; cursor:pointer; }
  .filter-summary:hover { background:rgba(255,255,255,.025); }
  .filter-icon { display:grid; width:30px; height:30px; place-items:center; color:var(--color-secondary); background:rgba(var(--color-secondary-rgb),.08); border:1px solid rgba(var(--color-secondary-rgb),.18); border-radius:8px; font-size:.65rem; }
  .filter-summary>span:nth-child(2) { display:flex; min-width:0; flex-direction:column; }
  .filter-summary strong { font-size:.66rem; }
  .filter-summary small { margin-top:.08rem; color:var(--text-muted); font-size:.53rem; }
  .filter-summary b { padding:.25rem .42rem; color:#b9adff; background:rgba(var(--color-primary-rgb),.07); border-radius:6px; font-size:.52rem; font-weight:700; }
  .compact-filter.is-filtered .filter-summary b { color:#ffd078; background:rgba(255,184,77,.07); }
  .filter-summary>svg { color:var(--text-muted); font-size:.55rem; }
  .filter-body { padding:.2rem .7rem .7rem; border-top:1px solid rgba(255,255,255,.045); }
  .filter-actions { display:flex; align-items:center; justify-content:space-between; gap:.8rem; padding:.55rem 0; }
  .filter-actions>span { color:var(--text-muted); font-size:.55rem; }
  .filter-actions>div { display:flex; gap:.3rem; }
  .filter-actions button { padding:.3rem .48rem; color:#b9adff; background:rgba(var(--color-primary-rgb),.07); border:1px solid rgba(var(--color-primary-rgb),.16); border-radius:7px; font-family:"Poppins",sans-serif; font-size:.5rem; font-weight:700; cursor:pointer; }
  .filter-actions button:last-child { color:var(--text-muted); background:rgba(255,255,255,.025); border-color:var(--border-subtle); }
  .filter-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:.35rem; }
  .filter-grid>button { display:grid; min-width:0; grid-template-columns:22px minmax(0,1fr); align-items:center; gap:.45rem; padding:.43rem .5rem; color:var(--text-muted); text-align:left; background:rgba(255,255,255,.018); border:1px solid var(--border-subtle); border-radius:8px; cursor:pointer; }
  .filter-grid>button:hover { background:rgba(255,255,255,.04); border-color:var(--border-strong); }
  .filter-grid>button>span { display:grid; width:22px; height:22px; place-items:center; color:#17342f; background:rgba(255,255,255,.04); border:1px solid var(--border-subtle); border-radius:6px; font-size:.46rem; }
  .filter-grid strong { overflow:hidden; color:#8992a4; font-size:.56rem; font-weight:600; text-overflow:ellipsis; white-space:nowrap; }
  .filter-grid>button.active { background:linear-gradient(125deg,rgba(var(--color-secondary-rgb),.09),rgba(var(--color-primary-rgb),.02)); border-color:rgba(var(--color-secondary-rgb),.25); }
  .filter-grid>button.active>span { background:var(--color-secondary); border-color:var(--color-secondary); }
  .filter-grid>button.active strong { color:#edf5f3; }
  .filter-note { display:flex; align-items:center; gap:.4rem; margin:.45rem .1rem .05rem; padding:.46rem .55rem; color:#ffd078; background:rgba(255,184,77,.05); border-radius:7px; font-size:.51rem; }

  /* Un ajuste activo cambia el borde y el icono: se reconoce de un vistazo. */
  .setting-row.is-on { border-color: rgba(var(--color-secondary-rgb), .3); }
  .setting-row.is-on .setting-icon { color: var(--color-secondary); background: rgba(var(--color-secondary-rgb), .1); border-color: rgba(var(--color-secondary-rgb), .28); }

  .setting-switch {
    display: flex;
    flex: 0 0 auto;
    flex-direction: column;
    align-items: center;
    gap: .35rem;
    padding: 0;
    background: transparent;
    border: 0;
    cursor: pointer;
  }
  .setting-switch i {
    position: relative;
    display: block;
    width: 46px;
    height: 25px;
    background: rgba(255, 255, 255, .09);
    border: 1px solid var(--border-subtle);
    border-radius: 99px;
    transition: background .18s ease, border-color .18s ease;
  }
  .setting-switch i::after {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 17px;
    height: 17px;
    background: #8e93a8;
    border-radius: 50%;
    content: "";
    transition: transform .18s ease, background .18s ease;
  }
  .setting-switch.on i { background: rgba(var(--color-secondary-rgb), .28); border-color: rgba(var(--color-secondary-rgb), .5); }
  .setting-switch.on i::after { background: var(--color-secondary); transform: translateX(21px); }
  .setting-switch em { color: var(--text-muted); font-size: .55rem; font-style: normal; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; }
  .setting-switch.on em { color: var(--color-secondary); }

  /* Control compacto: los pasos cubren el uso normal, el campo permite el valor exacto. */
  .setting-control { display: flex; flex: 0 0 auto; align-items: center; gap: .4rem; }
  .setting-control button {
    display: grid;
    width: 30px;
    height: 30px;
    place-items: center;
    color: var(--text-secondary);
    background: rgba(255, 255, 255, .04);
    border: 1px solid var(--border-subtle);
    border-radius: 9px;
    font-size: .6rem;
    cursor: pointer;
    transition: color .16s ease, background .16s ease, border-color .16s ease;
  }
  .setting-control button:hover:not(:disabled) { color: var(--text-primary); background: rgba(255, 255, 255, .08); border-color: var(--border-strong); }
  .setting-control button:disabled { opacity: .35; cursor: not-allowed; }
  .setting-control label { display: flex; min-width: 92px; flex-direction: column; align-items: center; gap: .15rem; padding: .3rem .5rem; background: rgba(0, 0, 0, .2); border: 1px solid var(--border-subtle); border-radius: 10px; }
  .setting-control input { width: 100%; color: var(--text-primary); text-align: center; background: transparent; border: 0; outline: 0; font-family: "Poppins", sans-serif; font-size: 1.05rem; font-weight: 700; }
  .setting-control input::-webkit-outer-spin-button, .setting-control input::-webkit-inner-spin-button { margin: 0; -webkit-appearance: none; }
  .setting-control input[type="number"] { -moz-appearance: textfield; }
  .setting-control label span { color: var(--text-muted); font-size: .55rem; letter-spacing: .06em; text-transform: uppercase; }

  @media (max-width: 720px) {
    .module-head { flex-direction: column; }
    .setting-row { flex-wrap: wrap; }
    .setting-control { width: 100%; justify-content: flex-end; }
    .voice-controls { width:100%; grid-template-columns:1fr; }
    .filter-actions { align-items:flex-start; flex-direction:column; }
    .filter-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
  }
  @media (min-width:721px) and (max-width:1100px) { .filter-grid { grid-template-columns:repeat(3,minmax(0,1fr)); } }
`;

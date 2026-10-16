import React, { useState } from "react";
import styled from "styled-components";
import AppIcon from "../../../shared/components/AppIcon";
import { useAuth } from "../context/AuthContext";

interface ApiError { response?: { data?: { message?: string } }; }

const LoginPage: React.FC = () => {
  const { signIn } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!username.trim() || !password) { setError("Ingresa tu usuario y contraseña."); return; }
    setIsSubmitting(true);
    setError("");
    try {
      await signIn(username.trim(), password);
    } catch (caught) {
      setError((caught as ApiError).response?.data?.message ?? "No fue posible iniciar sesión.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LoginPageStyle>
      <div className="backdrop" aria-hidden="true">
        <span className="orb orb-a" />
        <span className="orb orb-b" />
        <span className="grid-lines" />
        {[7, 23, 41, 58, 66].map((number, index) => (
          <span className={`ball ball-${index + 1}`} key={number}>{number}</span>
        ))}
      </div>

      <form className="login-card" onSubmit={handleSubmit}>
        <span className="card-glow" aria-hidden="true" />

        <div className="brand">
          <span className="brand-mark">B</span>
          <span className="brand-name">BINGO<i>ASODIFI</i></span>
        </div>

        <div className="fields">
          <label className={`field ${error ? "has-error" : ""}`}>
            <AppIcon icon="user" />
            <input
              value={username}
              onChange={(event) => { setUsername(event.target.value); setError(""); }}
              autoComplete="username"
              placeholder="Usuario"
              aria-label="Usuario"
              autoFocus
            />
          </label>

          <label className={`field ${error ? "has-error" : ""}`}>
            <AppIcon icon="lock" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => { setPassword(event.target.value); setError(""); }}
              autoComplete="current-password"
              placeholder="Contraseña"
              aria-label="Contraseña"
            />
            <button type="button" className="reveal" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
              <AppIcon icon={showPassword ? "power-off" : "check-square"} />
            </button>
          </label>
        </div>

        <div className={`error-slot ${error ? "visible" : ""}`} role="alert">
          {error && <><AppIcon icon="triangle-exclamation" />{error}</>}
        </div>

        <button type="submit" className="submit" disabled={isSubmitting}>
          {isSubmitting ? <span className="spinner" /> : <>Ingresar<AppIcon icon="angle-right" /></>}
        </button>
      </form>
    </LoginPageStyle>
  );
};

export default LoginPage;

const LoginPageStyle = styled.div`
  position: relative;
  display: grid;
  min-height: 100vh;
  place-items: center;
  overflow: hidden;
  padding: 1.5rem;
  background: radial-gradient(circle at 50% 0%, #1a1730 0%, #0c0f15 55%);

  .backdrop { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
  .orb { position: absolute; border-radius: 50%; filter: blur(90px); }
  .orb-a { top: -14%; left: -8%; width: 46vw; height: 46vw; background: rgba(124,92,255,.34); }
  .orb-b { right: -12%; bottom: -18%; width: 42vw; height: 42vw; background: rgba(39,211,178,.2); }
  .grid-lines { position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,.028) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.028) 1px, transparent 1px); background-size: 56px 56px; mask-image: radial-gradient(circle at 50% 40%, #000 10%, transparent 72%); }

  .ball { position: absolute; display: grid; place-items: center; color: rgba(255,255,255,.5); background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.07); border-radius: 50%; font-family: "Poppins", sans-serif; font-weight: 700; animation: float 9s ease-in-out infinite; }
  .ball-1 { top: 16%; left: 13%; width: 58px; height: 58px; font-size: .95rem; }
  .ball-2 { top: 64%; left: 8%; width: 42px; height: 42px; font-size: .75rem; animation-delay: -2s; }
  .ball-3 { top: 24%; right: 14%; width: 48px; height: 48px; font-size: .8rem; animation-delay: -4s; }
  .ball-4 { bottom: 18%; right: 11%; width: 66px; height: 66px; font-size: 1.05rem; animation-delay: -6s; }
  .ball-5 { bottom: 9%; left: 34%; width: 36px; height: 36px; font-size: .68rem; animation-delay: -3s; }
  @keyframes float { 50% { transform: translateY(-16px); } }

  .login-card { position: relative; display: flex; width: min(100%, 372px); flex-direction: column; overflow: hidden; padding: 2.4rem 2rem 2rem; background: linear-gradient(160deg, rgba(255,255,255,.055), rgba(255,255,255,.015)); border: 1px solid rgba(255,255,255,.1); border-radius: 24px; box-shadow: 0 30px 80px rgba(0,0,0,.55); backdrop-filter: blur(22px); }
  .card-glow { position: absolute; top: 0; left: 15%; width: 70%; height: 1px; background: linear-gradient(90deg, transparent, rgba(168,140,255,.9), transparent); }

  .brand { display: flex; align-items: center; justify-content: center; gap: .7rem; margin-bottom: 2rem; }
  .brand-mark { display: grid; width: 46px; height: 46px; place-items: center; color: #17130b; background: linear-gradient(145deg, #ffd88a, #f5a623); border-radius: 15px; font-family: "Poppins", sans-serif; font-size: 1.2rem; font-weight: 800; box-shadow: 0 10px 26px rgba(245,166,35,.28); }
  .brand-name { display: flex; flex-direction: column; color: #fff; font-family: "Poppins", sans-serif; font-size: 1.18rem; font-weight: 700; letter-spacing: .2em; line-height: 1; }
  .brand-name i { margin-top: .38rem; color: rgba(255,255,255,.42); font-size: .52rem; font-style: normal; font-weight: 600; letter-spacing: .26em; }

  .fields { display: flex; flex-direction: column; gap: .7rem; }
  .field { display: flex; align-items: center; gap: .7rem; padding: .92rem 1rem; background: rgba(0,0,0,.28); border: 1px solid rgba(255,255,255,.09); border-radius: 14px; transition: border-color .18s ease, box-shadow .18s ease, background .18s ease; }
  .field:focus-within { background: rgba(0,0,0,.34); border-color: rgba(168,140,255,.6); box-shadow: 0 0 0 3px rgba(124,92,255,.14); }
  .field.has-error { border-color: rgba(239,91,103,.55); }
  .field > svg { flex: 0 0 auto; color: rgba(255,255,255,.34); font-size: .8rem; }
  .field:focus-within > svg { color: #a88cff; }
  .field input { width: 100%; min-width: 0; color: #fff; background: transparent; border: 0; outline: 0; font-size: .82rem; }
  .field input::placeholder { color: rgba(255,255,255,.3); }
  .reveal { display: grid; flex: 0 0 auto; place-items: center; padding: 0; color: rgba(255,255,255,.32); background: none; border: 0; cursor: pointer; font-size: .72rem; }
  .reveal:hover { color: rgba(255,255,255,.7); }

  .error-slot { display: flex; align-items: center; gap: .45rem; min-height: 0; overflow: hidden; color: #ff8e99; font-size: .68rem; opacity: 0; transition: min-height .18s ease, opacity .18s ease, margin .18s ease; }
  .error-slot.visible { min-height: 20px; margin-top: .8rem; opacity: 1; }

  .submit { display: flex; align-items: center; justify-content: center; gap: .5rem; min-height: 48px; margin-top: 1.5rem; padding: .9rem 1.2rem; color: #fff; background: linear-gradient(135deg, #8a6bff, #6544e8); border: 0; border-radius: 14px; font-size: .82rem; font-weight: 600; cursor: pointer; transition: transform .18s ease, box-shadow .18s ease, filter .18s ease; box-shadow: 0 14px 32px rgba(101,68,232,.34); }
  .submit:hover:not(:disabled) { filter: brightness(1.08); transform: translateY(-1px); box-shadow: 0 18px 40px rgba(101,68,232,.44); }
  .submit:disabled { cursor: progress; opacity: .8; }
  .submit svg { font-size: .74rem; }
  .spinner { width: 17px; height: 17px; border: 2px solid rgba(255,255,255,.28); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 640px) { .ball { display: none; } .login-card { padding: 2rem 1.5rem 1.7rem; } }
`;

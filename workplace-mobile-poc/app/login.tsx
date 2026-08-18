"use client";

import { useState } from "react";
import type { FormEvent } from "react";

/*
 * DEMO GATE — not authentication.
 *
 * This only decides what the browser draws. There is no server, no session
 * cookie and no token, so anyone can skip it by editing the page state or by
 * reading the bundle. Do not put real employee, budget or contract data behind
 * it. Real access control belongs on the server: Okta/SSO in front of the app
 * (handoff P-004: 인증·RBAC·Audit) or the dispatch-owned Sign in with ChatGPT
 * helpers if the site stays on the Sites platform, plus a server-side
 * membership check on every request.
 */

export type Session = { email: string; name: string };

const DEMO_DOMAIN = "example.com";
const DEMO_EMAIL = `workplace.demo@${DEMO_DOMAIN}`;

export function LoginScreen({ onLogin }: { onLogin: (session: Session) => void }) {
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [error, setError] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError("사내 이메일 형식으로 입력해 주세요.");
      return;
    }
    setError("");
    onLogin({ email: value, name: value.split("@")[0] });
  };

  return (
    <main className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <span className="brand-dot" aria-hidden="true" />
          <span><b>WORKPLACE</b><small>Employee Center</small></span>
        </div>

        <h1>사내 계정으로 로그인</h1>
        <p className="login-lead">좌석·회의실 예약과 총무 업무 요청을 이용하려면 로그인이 필요합니다.</p>

        <form className="login-form" onSubmit={submit} noValidate>
          <label htmlFor="login-email">사내 이메일</label>
          <input
            id="login-email"
            type="email"
            autoComplete="username"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={`name@${DEMO_DOMAIN}`}
          />
          {error && <p className="login-error" role="alert">{error}</p>}
          <button className="login-submit" type="submit">로그인</button>
        </form>

        <button className="login-sso" type="button" onClick={() => onLogin({ email: DEMO_EMAIL, name: "데모 계정" })}>
          데모 계정으로 둘러보기
        </button>

        <p className="login-note">
          <b>데모 로그인입니다</b>
          이 화면은 흐름을 보여주기 위한 것이고 실제 인증이 아닙니다. 운영 전환 시 사내 SSO(Okta)로
          대체하고 서버에서 접근 권한을 검사해야 합니다.
        </p>
      </div>
    </main>
  );
}

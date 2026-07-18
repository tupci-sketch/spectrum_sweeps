import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { apiGet, apiErrorMessage } from "../api-client";
import { useAuth } from "../auth";
import { Button, ErrorText, Field } from "../admin-ui";
import { BrandWordmark } from "../components/Brand";

export default function Login() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [hasOwner, setHasOwner] = useState<boolean | null>(null);
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiGet<{ hasOwner: boolean }>("/api/auth/bootstrap")
      .then((r) => {
        setHasOwner(r.hasOwner);
        // No owner yet → default to the register screen to claim ownership.
        if (!r.hasOwner) setMode("register");
      })
      .catch(() => setHasOwner(true));
  }, []);

  useEffect(() => {
    if (user) navigate("/admin");
  }, [user, navigate]);

  const isFirstAccount = hasOwner === false;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register({ nickname, email, password, code: isFirstAccount ? undefined : code });
      }
      navigate("/admin");
    } catch (err) {
      setError(apiErrorMessage(err, "Something went wrong"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-6 flex justify-center"><BrandWordmark /></div>

      <div className="rounded-xl border border-border bg-surface/70 p-6">
        {isFirstAccount && mode === "register" && (
          <div className="mb-4 rounded-lg border border-gold/30 bg-gold/10 p-3 text-sm text-gold">
            No owner exists yet — this first account becomes the <strong>site owner</strong> (full control).
          </div>
        )}
        <h1 className="text-xl font-bold">{mode === "login" ? "Log in" : "Create your account"}</h1>

        <form className="mt-4 space-y-3" onSubmit={submit}>
          {mode === "register" && (
            <Field label="Nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} required minLength={2} />
          )}
          <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Field label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === "register" ? 8 : undefined} />
          {mode === "register" && !isFirstAccount && (
            <Field label="Invite code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required placeholder="SPCT-XXXXXX" />
          )}
          <Button disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}</Button>
          <ErrorText>{error}</ErrorText>
        </form>

        {!isFirstAccount && (
          <p className="mt-4 text-sm text-muted">
            {mode === "login" ? "Have an invite code? " : "Already have an account? "}
            <button
              className="text-brand hover:underline"
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}
            >
              {mode === "login" ? "Register" : "Log in"}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

"use client";
import { useActionState, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { login, type LoginState } from "@/server/actions/auth";
import { Field, buttonClass, inputClass, cx } from "@/components/ui";

export function LoginForm() {
  // A stopped server or lost connection shows a message instead of crashing the page.
  const [state, action, pending] = useActionState<LoginState, FormData>(async (prev, formData) => {
    try {
      return await login(prev, formData);
    } catch (e) {
      if (e instanceof TypeError) return { username: String(formData.get("username") ?? ""), error: "Couldn't reach Groundwork. Check that the app is running, then try again." };
      throw e;
    }
  }, {});
  const [show, setShow] = useState(false);
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error && (
        <div role="alert" className="rounded-lg border border-st-revision/30 bg-st-revision/8 px-3 py-2.5 text-sm text-st-revision">
          {state.error}
        </div>
      )}
      <Field label="Username" htmlFor="username" error={state.fieldErrors?.username}>
        <input
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="words"
          spellCheck={false}
          required
          defaultValue={state.username}
          aria-invalid={!!state.fieldErrors?.username}
          aria-describedby={state.fieldErrors?.username ? "username-error" : undefined}
          className={inputClass}
          placeholder="Your full name"
        />
      </Field>
      <Field label="Password" htmlFor="password" error={state.fieldErrors?.password}>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required
            aria-invalid={!!state.fieldErrors?.password}
            aria-describedby={state.fieldErrors?.password ? "password-error" : undefined}
            className={cx(inputClass, "pr-11")}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            aria-pressed={show}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-ink-3 hover:text-ink"
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </Field>
      <button type="submit" disabled={pending} className={buttonClass("primary", "lg", "w-full")}>
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Signing in
          </>
        ) : (
          "Sign in"
        )}
      </button>
    </form>
  );
}

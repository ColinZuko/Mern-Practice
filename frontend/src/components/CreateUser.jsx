import { createUser, verifyUser } from "../api";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../useAuth";
import { authButtonClass, authInputClass, authLabelClass } from "./Login";
import { PasswordInput } from "./PasswordInput";

export function CreateUser() {
  const [user, setUser] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  function handleChange(e) {
    setUser({ ...user, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await createUser(user);
      // Sign the new account straight in
      const { success } = await verifyUser({ email: user.email, password: user.password });
      if (success) {
        await login();
        navigate("/");
        return;
      }
      setErrorMessage("Account created. Please sign in.");
    } catch (error) {
      console.error(error);
      if (error.response && error.response.status === 400) {
        setErrorMessage(error.response.data?.message || "An account with this email already exists.");
      } else {
        setErrorMessage("Something went wrong while creating your account. Please try again later.");
      }
    }
    setIsSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="signup-name" className={authLabelClass}>Name</label>
        <input
          id="signup-name"
          onChange={handleChange}
          name="name"
          autoComplete="name"
          required
          maxLength={20}
          className={authInputClass}
        />
      </div>
      <div>
        <label htmlFor="signup-email" className={authLabelClass}>Email</label>
        <input
          id="signup-email"
          type="email"
          onChange={handleChange}
          name="email"
          autoComplete="email"
          required
          maxLength={50}
          className={authInputClass}
        />
      </div>
      <div>
        <label htmlFor="signup-password" className={authLabelClass}>Password</label>
        <PasswordInput
          id="signup-password"
          onChange={handleChange}
          name="password"
          autoComplete="new-password"
          required
          maxLength={72}
          minLength={6}
          pattern="(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).*"
          title="Password must contain at least one uppercase letter, one number, and one symbol."
          className={authInputClass}
        />
        <p className="mt-1.5 text-xs text-muted-foreground">
          At least 6 characters, with an uppercase letter, a number and a symbol.
        </p>
      </div>
      {errorMessage && (
        <p className="text-sm font-medium text-destructive">{errorMessage}</p>
      )}
      <button type="submit" disabled={isSubmitting} className={authButtonClass}>
        {isSubmitting ? "Creating account…" : "Create account"}
      </button>
      <p className="text-center text-xs text-muted-foreground">
        By creating an account you agree to how we handle your data, as explained in our{" "}
        <Link to="/privacy" className="font-medium text-primary hover:underline">privacy policy</Link>.
      </p>
    </form>
  );
}

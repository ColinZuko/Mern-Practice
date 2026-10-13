import { verifyUser } from "../api";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveToken } from "../auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Login() {
  const [user, setUser] = useState({
    email: "",
    password: "",
  });

  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  function handleChange(e) {
    setUser({ ...user, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);
    const { token, error } = await verifyUser(user);
    setIsSubmitting(false);

    if (token) {
      saveToken(token);
      navigate("/home");
    } else {
      setErrorMessage(error);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      <Input
        placeholder={"Email"}
        onChange={handleChange}
        name="email"
        required
        maxLength={50}
        className="mb-1"
      />
      <Input
        placeholder={"Password"}
        onChange={handleChange}
        name="password"
        type="password"
        required
        maxLength={20}
        className="mb-4"
      />
      <Button
        type="submit"
        disabled={isSubmitting}
        className="mb-2 hover:cursor-pointer bg-primary text-primary-foreground"
      >
        {isSubmitting ? "Logging in..." : "Login"}
      </Button>
      {errorMessage && (
        <p className="text-red-500 text-center mb-2 font-medium">
          {errorMessage}
        </p>
      )}
    </form>
  );
}

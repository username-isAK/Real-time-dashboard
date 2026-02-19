// src/Auth.jsx
import { useState } from "react";
import { supabase } from "./supabase";

function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const isValidEmail = (email) => /\S+@\S+\.\S+/.test(email);

  async function signIn() {
    if (!isValidEmail(email)) return alert("Enter a valid email");
    if (!password) return alert("Enter password");

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      alert("Login failed: " + error.message);
    }
  }

  async function signUp() {
    if (!isValidEmail(email)) return alert("Enter a valid email");
    if (!password || password.length < 6)
      return alert("Password must be at least 6 characters");

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      alert("Signup failed: " + error.message);
    } else {
      alert(
        "Signup successful! " +
          (data.user ? "You can now login." : "Check your email for confirmation.")
      );
    }
  }

  return (
    <div>
      <h2>Login / Signup</h2>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={loading}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={loading}
      />

      <button onClick={signIn} disabled={loading}>
        {loading ? "Processing..." : "Login"}
      </button>

      <button onClick={signUp} disabled={loading}>
        {loading ? "Processing..." : "Signup"}
      </button>
    </div>
  );
}

export default Auth;

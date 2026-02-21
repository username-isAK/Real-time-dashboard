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
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 space-y-6">
        <h2 className="text-2xl font-semibold text-center text-gray-800">
          Login / Signup
        </h2>

        <div className="space-y-4">
          <input
            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />

          <input
            type="password"
            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={signIn}
            disabled={loading}
            className="w-full py-2 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading ? "Processing..." : "Login"}
          </button>

          <button
            onClick={signUp}
            disabled={loading}
            className="w-full py-2 rounded-xl bg-gray-800 text-white font-medium hover:bg-gray-900 disabled:opacity-50 transition"
          >
            {loading ? "Processing..." : "Signup"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Auth;
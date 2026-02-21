import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import DashboardList from "./DashboardList";
import DashboardPage from "./DashboardPage";
import Auth from "./Auth";
import { Routes, Route } from "react-router-dom";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      const currentUser = data.session?.user ?? null;
      setUser(currentUser);

      if (currentUser) linkInvitedDashboards(currentUser);

      setLoading(false);
    };

    getSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const sUser = session?.user ?? null;
        setUser(sUser);
        if (sUser) linkInvitedDashboards(sUser);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function linkInvitedDashboards(user) {
    if (!user?.email || !user?.id) return;

    const { data, error } = await supabase
      .from("dashboard_members")
      .update({ user_id: user.id })
      .is("user_id", null)
      .eq("email", user.email)
      .select();

    if (error) {
      console.error("Link error:", error);
    } else {
      console.debug("Link success:", data);
    }
  }


  if (loading) return <div>Loading...</div>;

  if (!user) return <Auth />;

  return (
    <div>
      <Routes>
        <Route path="/" element={<DashboardList user={user} />} />
        <Route path="/dashboards/:id" element={<DashboardPage user={user} />} />
      </Routes>
    </div>
  );
}

export default App;

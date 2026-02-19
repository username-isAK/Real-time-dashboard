import { useEffect, useState } from "react";
import { supabase } from "./supabase";

function DashboardList({ user, openDashboard }) {
  const [dashboards, setDashboards] = useState([]);
  const [title, setTitle] = useState("");

  useEffect(() => {
    fetchDashboards();
  }, [user?.id, user?.email]);

  async function fetchDashboards() {
    if (!user?.id) return;

    const { data: owned } = await supabase
      .from("dashboards")
      .select("*")
      .eq("owner_id", user.id);

    const { data: memberById } = await supabase
      .from("dashboard_members")
      .select("dashboard:dashboards(*)")
      .eq("user_id", user.id);

    let memberByEmail = [];
    if (user.email) {
      const res = await supabase
        .from("dashboard_members")
        .select("dashboard:dashboards(*)")
        .eq("email", user.email);
      memberByEmail = res.data || [];
    }

    const memberDashboards = [
      ...(memberById?.map((m) => m.dashboard) || []),
      ...(memberByEmail?.map((m) => m.dashboard) || []),
    ];

    console.debug("dashboards: owned ->", owned);
    console.debug("dashboards: memberById ->", memberById);
    console.debug("dashboards: memberByEmail ->", memberByEmail);

    const map = new Map();
    (owned || []).forEach((d) => map.set(d.id, d));
    memberDashboards.forEach((d) => {
      if (d) map.set(d.id, d);
    });

    const dashboardsArray = Array.from(map.values()).sort((a, b) => {
      if (a.created_at && b.created_at) return new Date(b.created_at) - new Date(a.created_at);
      return 0;
    });

    setDashboards(dashboardsArray);
  }

  async function createDashboard() {
    if (!title) return;

    const { data, error } = await supabase
      .from("dashboards")
      .insert({
        name: title,
        owner_id: user.id,
      })
      .select()
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    setTitle("");

    if (data) {
      setDashboards((prev) => [data, ...prev]);
    } else {
      fetchDashboards();
    }
  }

  return (
    <div>
      <h2>Your Dashboards</h2>

      <input
        placeholder="Dashboard name"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <button onClick={createDashboard}>Create</button>

      <ul>
        {dashboards.map((d) => (
          <li key={d.id}>
            {d.name}
            <button onClick={() => openDashboard(d)}>Open</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default DashboardList;

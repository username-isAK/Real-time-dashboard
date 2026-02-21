import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabase";

function DashboardList({ user }) {
  const [dashboards, setDashboards] = useState([]);
  const [title, setTitle] = useState("");
  const navigate = useNavigate();

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

    const map = new Map();
    (owned || []).forEach((d) => map.set(d.id, d));
    memberDashboards.forEach((d) => {
      if (d) map.set(d.id, d);
    });

    const dashboardsArray = Array.from(map.values()).sort((a, b) => {
      if (a.created_at && b.created_at)
        return new Date(b.created_at) - new Date(a.created_at);
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

  async function logout() {
    await supabase.auth.signOut();
  }

  return (
    <div className="min-h-screen bg-gray-100 px-6 py-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-semibold text-gray-800">
            Your Dashboards
          </h2>
          <button
            onClick={logout}
            className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 cursor-pointer transition"
          >
            Logout
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <input
            className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            placeholder="Dashboard name"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button
            onClick={createDashboard}
            className="px-6 py-2 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 cursor-pointer transition"
          >
            Create
          </button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboards.map((d, idx) => (
            <div
              key={d.id ?? `dashboard-${idx}`}
              className="bg-white rounded-2xl shadow-md p-6 flex flex-col justify-between hover:shadow-lg transition"
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                {d.name}
              </h3>
              <button
                onClick={() => navigate(`/dashboards/${d.id}`)}
                className="mt-auto px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-medium hover:bg-gray-900 cursor-pointer transition"
              >
                Open
              </button>
            </div>
          ))}
        </div>

        {dashboards.length === 0 && (
          <p className="text-gray-500 text-center">
            No dashboards yet. Create one to get started.
          </p>
        )}
      </div>
    </div>
  );
}

export default DashboardList;
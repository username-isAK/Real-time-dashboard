import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "./supabase";
import WidgetItem from "./WidgetItem";

function DashboardPage({ dashboard: initialDashboard, user, goBack }) {
  const params = useParams();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(initialDashboard || null);
  const [members, setMembers] = useState([]);
  const [email, setEmail] = useState("");
  const [widgets, setWidgets] = useState([]);
  const [loadingWidgets, setLoadingWidgets] = useState(true);

  const isOwner = user?.id === dashboard?.owner_id;

  useEffect(() => {
    if (dashboard?.id) fetchMembers();
  }, [dashboard?.id]);

  useEffect(() => {
    if (!dashboard && params.id) {
      fetchDashboardById(params.id);
    }
  }, [params.id]);

  async function fetchDashboardById(id) {
    const { data } = await supabase
      .from("dashboards")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    setDashboard(data || null);
  }

  async function fetchMembers() {
    if (!dashboard?.id) return;
    const { data } = await supabase
      .from("dashboard_members")
      .select("*")
      .eq("dashboard_id", dashboard.id);

    setMembers(data || []);
  }

  async function addMember() {
    if (!email) return;

    const normalizedEmail = email.toLowerCase();

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    const { error } = await supabase.from("dashboard_members").insert({
      dashboard_id: dashboard.id,
      user_id: profile?.id ?? null,
      email: normalizedEmail,
      role: "editor",
    });

    if (error) {
      alert(error.message);
      return;
    }

    setEmail("");
    fetchMembers();
  }

  async function removeMember(memberId, memberUserId) {
    if (!isOwner) return;
    if (memberUserId === user.id) return;

    await supabase
      .from("dashboard_members")
      .delete()
      .eq("id", memberId);

    fetchMembers();
  }

  useEffect(() => {
    if (dashboard?.id) fetchWidgets();
  }, [dashboard?.id]);

  async function fetchWidgets() {
    if (!dashboard?.id) return;
    const { data } = await supabase
      .from("widgets")
      .select("*")
      .eq("dashboard_id", dashboard.id)
      .order("created_at", { ascending: true });

    setWidgets(data || []);
    setLoadingWidgets(false);
  }

  async function createWidget() {
    const { data, error } = await supabase
      .from("widgets")
      .insert({
        dashboard_id: dashboard.id,
        type: "text",
        content: { text: "New Widget" },
        position: { x: 0, y: 0, w: 4, h: 2 },
      })
      .select()
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    setWidgets((prev) => [...prev, data]);
  }

  useEffect(() => {
    const test = supabase
      .channel("test")
      .subscribe((status) => {
        console.log("Test status:", status);
      });

    return () => {
      supabase.removeChannel(test);
    };
  }, []);

  useEffect(() => {
    if (!dashboard?.id) return;

    const channel = supabase
      .channel(`widgets-${dashboard.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "widgets",
          filter: `dashboard_id=eq.${dashboard.id}`,
        },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload;

          setWidgets((prev) => {
            if (eventType === "INSERT") {
              if (prev.some((w) => w.id === newRow.id)) return prev;
              return [...prev, newRow];
            }

            if (eventType === "UPDATE") {
              return prev.map((w) =>
                w.id === newRow.id ? newRow : w
              );
            }

            if (eventType === "DELETE") {
              return prev.filter((w) => w.id !== oldRow.id);
            }

            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dashboard?.id]);

  const updateWidget = async (widgetId, newContent) => {
    const widget = widgets.find((w) => w.id === widgetId);
    if (!widget) return;

    const currentVersion = Number(widget.version) || 0;

    const { error } = await supabase.rpc(
      "update_widget_with_version",
      {
        p_id: widgetId,
        p_content: newContent,
        p_version: currentVersion,
      }
    );

    if (error) {
      alert(error.message || "Update failed");
    }
  };

  const deleteWidget = async (widgetId) => {
    const { data, error } = await supabase
      .from("widgets")
      .delete()
      .eq("id", widgetId)
      .select();

    if (error) {
      console.error("Delete error:", error);
      alert(error.message);
      return;
    }

    if (!data || data.length === 0) {
      alert("Delete failed (maybe RLS blocked it)");
      return;
    }

    setWidgets((prev) =>
      prev.filter((w) => w.id !== widgetId)
    );
  };

  return (
  <div className="min-h-screen bg-gray-100 px-6 py-10">
    <div className="max-w-4xl mx-auto space-y-8">

      <button
        onClick={() => (goBack ? goBack() : navigate(-1))}
        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition cursor-pointer"
      >
        ← Back
      </button>

      {!dashboard ? (
        <p className="text-gray-600">Loading dashboard...</p>
      ) : (
        <h2 className="text-3xl font-bold text-gray-800">
          {dashboard.name}
        </h2>
      )}

      <div className="bg-white rounded-2xl shadow-md p-6 space-y-4">
        <h3 className="text-xl font-semibold text-gray-800">Members</h3>

        {isOwner && (
          <div className="flex gap-4">
            <input
              placeholder="Enter user email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button
              onClick={addMember}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition cursor-pointer"
            >
              Add Member
            </button>
          </div>
        )}

        <ul className="space-y-2">
          {members.map((m, idx) => (
            <li
              key={m.id ?? `member-${m.email ?? idx}-${idx}`}
              className="flex justify-between items-center bg-gray-50 px-4 py-2 rounded-lg"
            >
              <span>
                {m.email} - {m.role}
              </span>

              {isOwner && m.user_id !== user.id && (
                <button
                  onClick={() => removeMember(m.id, m.user_id)}
                  className="px-3 py-1 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 transition cursor-pointer"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white rounded-2xl shadow-md p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold text-gray-800">
            Widgets
          </h3>

          <button
            onClick={createWidget}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition cursor-pointer"
          >
            Add Widget
          </button>
        </div>

        {loadingWidgets ? (
          <p className="text-gray-600">Loading widgets...</p>
        ) : (
          <ul className="space-y-3">
            {widgets.map((w) => (
              <WidgetItem
                key={w.id}
                widget={w}
                onUpdate={updateWidget}
                onDelete={deleteWidget}
              />
            ))}
          </ul>
        )}
      </div>

    </div>
  </div>
);
}

export default DashboardPage;

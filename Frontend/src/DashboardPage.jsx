import { useEffect, useState } from "react";
import { supabase } from "./supabase";

function DashboardPage({ dashboard, user, goBack }) {
  const [members, setMembers] = useState([]);
  const [email, setEmail] = useState("");
  const [widgets, setWidgets] = useState([]);
  const [loadingWidgets, setLoadingWidgets] = useState(true);

  const isOwner = user?.id === dashboard.owner_id;

  useEffect(() => {
    fetchMembers();
  }, [dashboard.id]);

  async function fetchMembers() {
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
    fetchWidgets();
  }, [dashboard.id]);

  async function fetchWidgets() {
    const { data } = await supabase
      .from("widgets")
      .select("*")
      .eq("dashboard_id", dashboard.id)
      .order("created_at", { ascending: true });

    console.log("Fetched widgets:", data);

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

    console.log("Created widget:", data);

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
    const channel = supabase
      .channel("widgets-db-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "widgets",
        },
        (payload) => {
          console.log("Change received:", payload);
          fetchWidgets();
        }
      )
      .subscribe((status) => {
        console.log("Realtime status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);


  const updateWidget = async (widgetId, newContent) => {
    const widget = widgets.find((w) => w.id === widgetId);
    if (!widget) return;

    const currentVersion = Number(widget.version);

    const { data, error } = await supabase.rpc(
      "update_widget_with_version",
      {
        p_id: widgetId,
        p_content: newContent,
        p_version: currentVersion,
      }
    );

    if (error) {
      console.error(error);
      return;
    }

    if (!data) {
      alert("This widget was updated by someone else.");
      fetchWidgets();
      return;
    }

    setWidgets((prev) =>
      prev.map((w) => (w.id === widgetId ? data : w))
    );
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
    <div style={{ padding: "20px" }}>
      <button onClick={goBack}>Back</button>

      <h2>{dashboard.name}</h2>

      <h3>Members</h3>

      {isOwner && (
        <>
          <input
            placeholder="Enter user email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button onClick={addMember}>Add Member</button>
        </>
      )}

      <ul>
        {members.map((m) => (
          <li key={m.id}>
            {m.email} - {m.role}
            {isOwner && m.user_id !== user.id && (
              <button
                style={{ marginLeft: "10px" }}
                onClick={() =>
                  removeMember(m.id, m.user_id)
                }
              >
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>

      <h3>Widgets</h3>

      <button onClick={createWidget}>Add Widget</button>

      {loadingWidgets ? (
        <p>Loading widgets...</p>
      ) : (
        <ul>
          {widgets.map((w) => (
            <li key={w.id}>
              {w.type === "text" && w.content?.text}

              <button
                onClick={() =>
                  updateWidget(w.id, {
                    text: "Edited at " + Date.now(),
                  })
                }
                style={{ marginLeft: "10px" }}
              >
                Edit
              </button>

              <button
                onClick={() => deleteWidget(w.id)}
                style={{ marginLeft: "10px", color: "red" }}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default DashboardPage;

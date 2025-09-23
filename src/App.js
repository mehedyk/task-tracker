import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";

const TaskTracker = () => {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  // auth form states
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const session = supabase.auth.getSession();
    session.then(({ data }) => {
      if (data?.session?.user) {
        setUser(data.session.user);
        loadTasks(data.session.user.id);
      }
    });
  }, []);

  const loadTasks = async (userId) => {
    let { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .eq("date", today);

    if (error) {
      setMessage("⚠️ Could not fetch tasks");
    } else {
      setTasks(data);
    }
  };

  const handleAuth = async () => {
    setLoading(true);
    setMessage(null);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setUser(data.user);
        loadTasks(data.user.id);
        setMessage("✅ Signed in successfully!");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setUser(data.user);
        setMessage("✅ Account created! Check your email to confirm.");

        const defaultTasks = [
          "Drink Water (8 glasses)",
          "Exercise (30 min)",
          "Study/Learn (1 hour)",
          "Eat Healthy Meals",
          "Sleep 8 hours",
          "Meditate (10 min)",
        ];

        for (const t of defaultTasks) {
          await supabase.from("tasks").insert([
            {
              user_id: data.user.id,
              task_name: t,
              completed: false,
              date: today,
            },
          ]);
        }
        loadTasks(data.user.id);
      }
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    }

    setLoading(false);
  };

  // Toggle task completion
  const toggleTask = async (task) => {
    const { data, error } = await supabase
      .from("tasks")
      .update({ completed: !task.completed })
      .eq("id", task.id);

    if (error) {
      setMessage("⚠️ Could not update task");
    } else {
      loadTasks(user.id);
    }
  };

  // Sign out
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setTasks([]);
    setMessage("✅ Signed out successfully");
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
        <div className="bg-white p-6 rounded-lg shadow-md w-80">
          <h1 className="text-xl font-bold mb-4 text-center">Task Tracker</h1>

          {!isLogin && (
            <input
              type="text"
              placeholder="Name (optional)"
              className="w-full p-2 border rounded mb-2"
            />
          )}

          <input
            type="email"
            placeholder="Email"
            className="w-full p-2 border rounded mb-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full p-2 border rounded mb-4"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            onClick={handleAuth}
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
          >
            {loading ? "Processing..." : isLogin ? "Sign In" : "Sign Up"}
          </button>

          <p
            onClick={() => setIsLogin(!isLogin)}
            className="mt-4 text-sm text-blue-600 text-center cursor-pointer"
          >
            {isLogin
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"}
          </p>

          {message && (
            <p className="mt-3 text-sm text-center text-red-500">{message}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">Today's Tasks</h1>
        <button
          onClick={handleSignOut}
          className="text-sm bg-red-500 text-white px-3 py-1 rounded"
        >
          Sign Out
        </button>
      </div>

      {message && (
        <p className="mb-4 text-sm text-center text-green-600">{message}</p>
      )}

      <div className="space-y-3">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between p-3 bg-white shadow rounded"
            >
              <span
                className={`${
                  task.completed ? "line-through text-gray-500" : "text-black"
                }`}
              >
                {task.task_name}
              </span>
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => toggleTask(task)}
              />
            </div>
          ))
        ) : (
          <p className="text-gray-600">No tasks for today.</p>
        )}
      </div>
    </div>
  );
};

export default TaskTracker;

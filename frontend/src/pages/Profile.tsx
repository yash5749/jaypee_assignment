import { useEffect, useState } from "react";
import AuthenticatedLayout from "../layouts/AuthenticatedLayout";
import { useAuth } from "../hooks/useAuth";
import { getErrorMessage } from "../utils/apiError";

const ProfilePage = () => {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
  }, [user]);

  const createdAt = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString()
    : "—";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      await updateProfile(name, email);
      setSuccess("Profile updated successfully.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthenticatedLayout>
      <div className="flex flex-col gap-6 lg:gap-8">
        <section className="hero-panel animate-rise">
          <p className="section-eyebrow">Profile</p>
          <h1 className="display-title mt-4">Your account details</h1>
          <p className="section-copy mt-4 max-w-2xl">
            Keep your name and email current so your study rooms stay personal
            and recognizable.
          </p>
        </section>

        {error && <p className="app-alert-error animate-rise">{error}</p>}
        {success && <p className="app-alert-success animate-rise">{success}</p>}

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="surface-card-strong animate-rise p-6 sm:p-7">
            <p className="section-eyebrow">Account summary</p>
            <div className="mt-5 space-y-4 text-sm text-[color:var(--text)]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--text-soft)]">
                  Name
                </p>
                <p className="mt-2 text-base font-semibold">{user?.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--text-soft)]">
                  Email
                </p>
                <p className="mt-2 text-base font-semibold">{user?.email ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--text-soft)]">
                  Account created
                </p>
                <p className="mt-2 text-base font-semibold">{createdAt}</p>
              </div>
            </div>
          </section>

          <section className="surface-card-strong animate-rise p-6 sm:p-7">
            <p className="section-eyebrow">Edit details</p>
            <h2 className="section-title mt-3">Update your profile</h2>
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <label className="app-label">
                Name
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="app-input"
                  placeholder="Your name"
                  required
                />
              </label>

              <label className="app-label">
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="app-input"
                  placeholder="you@example.com"
                  required
                />
              </label>

              <button
                type="submit"
                disabled={saving}
                className="app-button-primary sm:min-w-40"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </form>
          </section>
        </div>
      </div>
    </AuthenticatedLayout>
  );
};

export default ProfilePage;

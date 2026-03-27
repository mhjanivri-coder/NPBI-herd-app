import { useEffect, useMemo, useState } from "react";
import "./styles.css";

const BREEDS = ["Murrah buffalo", "Nili-Ravi buffalo"];
const SEX_OPTIONS = ["Female", "Male"];
const STATUS_OPTIONS = ["Active (present in herd)", "Dead", "Culled"];
const STORAGE_KEY = "buffalo_herd_app_phase_2";

const EMPTY_ANIMAL = {
  tagNo: "",
  breed: "Nili-Ravi buffalo",
  sex: "Female",
  dob: "",
  identificationMark: "",
  status: "Active (present in herd)",
  exitDate: "",
  exitReason: "",
};

function normalizeAnimal(form) {
  const next = { ...form };
  if (next.status === "Active (present in herd)") {
    next.exitDate = "";
    next.exitReason = "";
  }
  return next;
}

function isArchived(animal) {
  return (
    (animal.status === "Dead" || animal.status === "Culled") &&
    Boolean((animal.exitDate || "").trim()) &&
    Boolean((animal.exitReason || "").trim())
  );
}

function sortByTag(a, b) {
  const aNum = Number(a.tagNo);
  const bNum = Number(b.tagNo);
  const aIsNum = Number.isFinite(aNum) && !Number.isNaN(aNum);
  const bIsNum = Number.isFinite(bNum) && !Number.isNaN(bNum);

  if (aIsNum && bIsNum) return aNum - bNum;

  return String(a.tagNo).localeCompare(String(b.tagNo), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function StatCard({ title, value }) {
  return (
    <div className="stat-card">
      <div className="stat-title">{title}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

function loadSavedAnimals() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [animals, setAnimals] = useState(() => loadSavedAnimals());
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("current");
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ ...EMPTY_ANIMAL });
  const [editForm, setEditForm] = useState({ ...EMPTY_ANIMAL });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(animals));
  }, [animals]);

  const activeAnimals = useMemo(
    () => animals.filter((animal) => !isArchived(animal)),
    [animals]
  );

  const archivedAnimals = useMemo(
    () => animals.filter((animal) => isArchived(animal)),
    [animals]
  );

  const visibleAnimals = useMemo(() => {
    const q = search.toLowerCase().trim();
    const source = view === "current" ? activeAnimals : archivedAnimals;

    return source.filter((animal) =>
      [
        animal.tagNo,
        animal.breed,
        animal.sex,
        animal.status,
        animal.identificationMark,
        animal.exitReason,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [activeAnimals, archivedAnimals, search, view]);

  const selectedAnimal =
    animals.find((animal) => animal.id === selectedId) || null;

  const stats = useMemo(
    () => ({
      currentHerd: activeAnimals.length,
      females: activeAnimals.filter((animal) => animal.sex === "Female").length,
      males: activeAnimals.filter((animal) => animal.sex === "Male").length,
      archived: archivedAnimals.length,
    }),
    [activeAnimals, archivedAnimals]
  );

  function addAnimal() {
    const prepared = normalizeAnimal(form);

    if (!prepared.tagNo.trim()) {
      setMessage("Tag No. is required.");
      return;
    }

    const nextAnimal = {
      id: Date.now(),
      ...prepared,
    };

    const nextAnimals = [...animals, nextAnimal].sort(sortByTag);
    setAnimals(nextAnimals);
    setSelectedId(nextAnimal.id);
    setForm({ ...EMPTY_ANIMAL });
    setShowAdd(false);
    setMessage("Animal added successfully.");
  }

  function openEditAnimal() {
    if (!selectedAnimal) return;
    setEditForm({ ...selectedAnimal });
    setShowEdit(true);
    setMessage("");
  }

  function saveEditedAnimal() {
    const prepared = normalizeAnimal(editForm);

    if (!prepared.tagNo.trim()) {
      setMessage("Tag No. is required.");
      return;
    }

    const nextAnimals = animals
      .map((animal) =>
        animal.id === selectedAnimal.id ? { ...animal, ...prepared } : animal
      )
      .sort(sortByTag);

    setAnimals(nextAnimals);
    setShowEdit(false);
    setMessage("Animal updated successfully.");
  }

  function deleteSelectedAnimal() {
    if (!selectedAnimal) return;
    const ok = window.confirm(
      `Delete animal ${selectedAnimal.tagNo}? This cannot be undone.`
    );
    if (!ok) return;

    const nextAnimals = animals.filter((animal) => animal.id !== selectedAnimal.id);
    setAnimals(nextAnimals);
    setSelectedId(null);
    setShowEdit(false);
    setMessage(`Animal ${selectedAnimal.tagNo} deleted.`);
  }

  function clearAllBrowserData() {
    const ok = window.confirm(
      "Clear all animals saved in this browser? This cannot be undone."
    );
    if (!ok) return;

    setAnimals([]);
    setSelectedId(null);
    setShowAdd(false);
    setShowEdit(false);
    setForm({ ...EMPTY_ANIMAL });
    setEditForm({ ...EMPTY_ANIMAL });
    setMessage("All browser-saved herd data cleared.");
  }

  return (
    <div className="page">
      <div className="container">
        <section className="panel">
          <div className="header-row">
            <div>
              <h1>Buffalo Animal Data Recording App</h1>
              <p>Phase 3 · edit + browser save + delete and reset controls</p>
            </div>

            <div className="button-row top-actions">
              <button
                className="primary-btn"
                onClick={() => setShowAdd((prev) => !prev)}
              >
                {showAdd ? "Close Add Animal" : "Add Animal"}
              </button>
              <button className="danger-btn" onClick={clearAllBrowserData}>
                Clear Browser Data
              </button>
            </div>
          </div>
        </section>

        {message && <div className="message">{message}</div>}

        {showAdd && (
          <section className="panel">
            <h2>Add Animal</h2>

            <div className="grid">
              <label className="field">
                <span>Breed</span>
                <select
                  value={form.breed}
                  onChange={(e) => setForm((prev) => ({ ...prev, breed: e.target.value }))}
                >
                  {BREEDS.map((breed) => (
                    <option key={breed} value={breed}>
                      {breed}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Tag No.</span>
                <input
                  value={form.tagNo}
                  onChange={(e) => setForm((prev) => ({ ...prev, tagNo: e.target.value }))}
                />
              </label>

              <label className="field">
                <span>Sex</span>
                <select
                  value={form.sex}
                  onChange={(e) => setForm((prev) => ({ ...prev, sex: e.target.value }))}
                >
                  {SEX_OPTIONS.map((sex) => (
                    <option key={sex} value={sex}>
                      {sex}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Date of Birth</span>
                <input
                  placeholder="dd/mm/yyyy"
                  value={form.dob}
                  onChange={(e) => setForm((prev) => ({ ...prev, dob: e.target.value }))}
                />
              </label>

              <label className="field">
                <span>Identification Mark</span>
                <input
                  value={form.identificationMark}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      identificationMark: e.target.value,
                    }))
                  }
                />
              </label>

              <label className="field">
                <span>Status</span>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((prev) =>
                      normalizeAnimal({ ...prev, status: e.target.value })
                    )
                  }
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              {form.status !== "Active (present in herd)" && (
                <>
                  <label className="field">
                    <span>Date of Death / Culling</span>
                    <input
                      placeholder="dd/mm/yyyy"
                      value={form.exitDate}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          exitDate: e.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className="field">
                    <span>Reason of Death / Culling</span>
                    <input
                      value={form.exitReason}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          exitReason: e.target.value,
                        }))
                      }
                    />
                  </label>
                </>
              )}
            </div>

            <div className="button-row">
              <button className="primary-btn" onClick={addAnimal}>
                Save Animal
              </button>
              <button
                className="secondary-btn"
                onClick={() => {
                  setForm({ ...EMPTY_ANIMAL });
                  setShowAdd(false);
                }}
              >
                Cancel
              </button>
            </div>
          </section>
        )}

        {showEdit && (
          <section className="panel">
            <h2>Edit Animal</h2>

            <div className="grid">
              <label className="field">
                <span>Breed</span>
                <select
                  value={editForm.breed}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, breed: e.target.value }))}
                >
                  {BREEDS.map((breed) => (
                    <option key={breed} value={breed}>
                      {breed}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Tag No.</span>
                <input
                  value={editForm.tagNo}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, tagNo: e.target.value }))}
                />
              </label>

              <label className="field">
                <span>Sex</span>
                <select
                  value={editForm.sex}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, sex: e.target.value }))}
                >
                  {SEX_OPTIONS.map((sex) => (
                    <option key={sex} value={sex}>
                      {sex}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Date of Birth</span>
                <input
                  placeholder="dd/mm/yyyy"
                  value={editForm.dob}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, dob: e.target.value }))}
                />
              </label>

              <label className="field">
                <span>Identification Mark</span>
                <input
                  value={editForm.identificationMark}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      identificationMark: e.target.value,
                    }))
                  }
                />
              </label>

              <label className="field">
                <span>Status</span>
                <select
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm((prev) =>
                      normalizeAnimal({ ...prev, status: e.target.value })
                    )
                  }
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              {editForm.status !== "Active (present in herd)" && (
                <>
                  <label className="field">
                    <span>Date of Death / Culling</span>
                    <input
                      placeholder="dd/mm/yyyy"
                      value={editForm.exitDate}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          exitDate: e.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className="field">
                    <span>Reason of Death / Culling</span>
                    <input
                      value={editForm.exitReason}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          exitReason: e.target.value,
                        }))
                      }
                    />
                  </label>
                </>
              )}
            </div>

            <div className="button-row">
              <button className="primary-btn" onClick={saveEditedAnimal}>
                Save Changes
              </button>
              <button className="danger-btn" onClick={deleteSelectedAnimal}>
                Delete Animal
              </button>
              <button
                className="secondary-btn"
                onClick={() => setShowEdit(false)}
              >
                Cancel
              </button>
            </div>
          </section>
        )}

        <section className="stats-grid">
          <StatCard title="Current Herd" value={stats.currentHerd} />
          <StatCard title="Females" value={stats.females} />
          <StatCard title="Males" value={stats.males} />
          <StatCard title="Archived" value={stats.archived} />
        </section>

        <section className="main-grid">
          <section className="panel">
            <h2>Herd Registry</h2>

            <label className="field">
              <span>Search</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>

            <div className="button-row">
              <button
                className={view === "current" ? "primary-btn" : "secondary-btn"}
                onClick={() => setView("current")}
              >
                Current Herd
              </button>
              <button
                className={view === "archive" ? "primary-btn" : "secondary-btn"}
                onClick={() => setView("archive")}
              >
                Archive
              </button>
            </div>

            <div className="list">
              {visibleAnimals.length === 0 && (
                <div className="empty-box">No animals found.</div>
              )}

              {visibleAnimals.map((animal) => (
                <button
                  key={animal.id}
                  className={
                    selectedId === animal.id
                      ? "animal-card selected"
                      : "animal-card"
                  }
                  onClick={() => setSelectedId(animal.id)}
                >
                  <div className="animal-title">{animal.tagNo}</div>
                  <div className="animal-subtitle">
                    {animal.breed} · {animal.sex}
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="header-row">
              <div>
                <h2>Selected Animal Preview</h2>
                <p>Data saves automatically in this browser.</p>
              </div>

              {selectedAnimal && (
                <button className="secondary-btn" onClick={openEditAnimal}>
                  Edit Animal
                </button>
              )}
            </div>

            {!selectedAnimal && (
              <div className="empty-box">No animal selected.</div>
            )}

            {selectedAnimal && (
              <div className="preview-grid">
                <div>
                  <div className="label">Tag No.</div>
                  <div className="value">{selectedAnimal.tagNo}</div>
                </div>
                <div>
                  <div className="label">Breed</div>
                  <div className="value">{selectedAnimal.breed}</div>
                </div>
                <div>
                  <div className="label">Sex</div>
                  <div className="value">{selectedAnimal.sex}</div>
                </div>
                <div>
                  <div className="label">DOB</div>
                  <div className="value">{selectedAnimal.dob || "—"}</div>
                </div>
                <div>
                  <div className="label">Status</div>
                  <div className="value">{selectedAnimal.status}</div>
                </div>
                <div>
                  <div className="label">Identification Mark</div>
                  <div className="value">
                    {selectedAnimal.identificationMark || "—"}
                  </div>
                </div>

                {isArchived(selectedAnimal) && (
                  <>
                    <div>
                      <div className="label">Exit Date</div>
                      <div className="value">{selectedAnimal.exitDate || "—"}</div>
                    </div>
                    <div>
                      <div className="label">Exit Reason</div>
                      <div className="value">
                        {selectedAnimal.exitReason || "—"}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </section>
        </section>
      </div>
    </div>
  );
}

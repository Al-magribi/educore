import React from "react";
import { useGetStudentDashQuery } from "../../../service/main/ApiDash";
import { BookOpen, ClipboardList, GraduationCap, User } from "lucide-react";

const styles = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 16,
  },
  card: {
    background: "white",
    borderRadius: 16,
    padding: 16,
    border: "1px solid #e2e8f0",
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.06)",
  },
  cardTitle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontWeight: 600,
    fontSize: 14,
    color: "#0f172a",
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 700,
    color: "#0f172a",
  },
  statLabel: {
    fontSize: 12,
    color: "#64748b",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  listItem: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  badge: {
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    background: "#e2e8f0",
    color: "#1e293b",
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    background: "#e2e8f0",
    overflow: "hidden",
  },
  progressFill: (color, percent) => ({
    height: "100%",
    width: `${percent}%`,
    background: color,
    borderRadius: 999,
  }),
  empty: {
    fontSize: 13,
    color: "#94a3b8",
    padding: "8px 0",
  },
  spinnerWrap: {
    minHeight: 240,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  spinner: {
    width: 36,
    height: 36,
    border: "3px solid #e2e8f0",
    borderTopColor: "#0ea5e9",
    borderRadius: "50%",
    animation: "spin 0.9s linear infinite",
  },
  error: {
    padding: 16,
    borderRadius: 12,
    background: "#fee2e2",
    color: "#b91c1c",
    border: "1px solid #fecaca",
  },
};

const StudentDash = () => {
  const { data, isLoading, isError } = useGetStudentDashQuery();

  if (isLoading) {
    return (
      <div style={styles.spinnerWrap}>
        <style>
          {`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}
        </style>
        <div style={styles.spinner} />
      </div>
    );
  }

  if (isError) {
    return <div style={styles.error}>Gagal memuat data dashboard siswa.</div>;
  }

  const studentName = data?.student?.full_name || "Siswa";
  const studentInitial = studentName?.[0]?.toUpperCase() || "S";

  return (
    <div style={styles.page}>
      <section style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <User size={18} /> Detail Siswa
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 16,
                background: "#0f172a",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 600,
                fontSize: 18,
              }}
            >
              {studentInitial}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
                {studentName}
              </div>
              <div style={{ fontSize: 13, color: "#64748b" }}>
                {data?.classInfo?.name || "Belum ada kelas"} -{" "}
                {data?.classInfo?.grade || "-"}{" "}
                {data?.classInfo?.major && data.classInfo.major !== "-"
                  ? `- ${data.classInfo.major}`
                  : ""}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            <div style={styles.listItem}>
              <span style={styles.statLabel}>NIS</span>
              <span style={{ fontWeight: 600 }}>
                {data?.student?.nis || "-"}
              </span>
            </div>
            <div style={styles.listItem}>
              <span style={styles.statLabel}>NISN</span>
              <span style={{ fontWeight: 600 }}>
                {data?.student?.nisn || "-"}
              </span>
            </div>
            <div style={styles.listItem}>
              <span style={styles.statLabel}>Sekolah</span>
              <span style={{ fontWeight: 600 }}>
                {data?.homebase?.name || "Sekolah"}
              </span>
            </div>
            <div style={styles.listItem}>
              <span style={styles.statLabel}>Periode Aktif</span>
              <span style={{ fontWeight: 600 }}>
                {data?.activePeriode?.name || "Periode belum aktif"}
              </span>
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <BookOpen size={18} /> Mata Pelajaran
          </div>
          <div style={styles.list}>
            {data?.subjects?.length ? (
              data.subjects.map((item) => (
                <div key={item.id} style={styles.listItem}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      {item.code || "Tanpa kode"}
                    </div>
                  </div>
                  <span style={styles.badge}>Mapel</span>
                </div>
              ))
            ) : (
              <div style={styles.empty}>Daftar mapel belum tersedia.</div>
            )}
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <ClipboardList size={18} /> Ujian Aktif
          </div>
          <div style={styles.list}>
            {data?.exams?.length ? (
              data.exams.map((item) => (
                <div key={item.id} style={styles.listItem}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      {item.subject_name} - {item.duration_minutes} menit
                    </div>
                  </div>
                  <span style={styles.badge}>Aktif</span>
                </div>
              ))
            ) : (
              <div style={styles.empty}>Belum ada ujian aktif.</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default StudentDash;

import { useMemo, useState } from "react";
import {
  BookOpen,
  ClipboardCheck,
  Filter,
  GraduationCap,
  LoaderCircle,
  UserRound,
} from "lucide-react";
import { useGetParentAcademicReportQuery } from "../../../service/lms/ApiParent";

const MONTH_OPTIONS = [
  { value: "", label: "Semua Bulan" },
  { value: "1", label: "Januari" },
  { value: "2", label: "Februari" },
  { value: "3", label: "Maret" },
  { value: "4", label: "April" },
  { value: "5", label: "Mei" },
  { value: "6", label: "Juni" },
  { value: "7", label: "Juli" },
  { value: "8", label: "Agustus" },
  { value: "9", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
];

const SEMESTER_OPTIONS = [
  { value: "", label: "Semua Semester" },
  { value: "1", label: "Semester 1" },
  { value: "2", label: "Semester 2" },
];

const cardStyle = {
  border: "1px solid #e6e8ec",
  borderRadius: 14,
  background: "#fff",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
};

const metricLabelStyle = {
  fontSize: 12,
  color: "#667085",
  marginBottom: 4,
};

const metricValueStyle = {
  fontSize: 18,
  color: "#101828",
  fontWeight: 700,
};

const toFixedOrDash = (value) => {
  if (value === null || value === undefined) return "-";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "-";
  return parsed.toFixed(2);
};

const getDefaultPublishedMonth = () => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1..12
  const releaseDay = 10;
  const offset = now.getDate() < releaseDay ? 2 : 1;
  const normalized = ((currentMonth - offset - 1 + 12) % 12) + 1;
  return String(normalized);
};

const deriveSemesterFromMonth = (monthValue) => {
  if (!monthValue) return "";
  const monthNum = Number(monthValue);
  if (!Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) return "";
  return monthNum >= 7 ? "1" : "2";
};

const renderAttendanceText = (attendance) => {
  const rate =
    attendance?.rate === null || attendance?.rate === undefined
      ? "-"
      : `${Number(attendance.rate).toFixed(2)}%`;
  return `${rate} (H:${attendance?.hadir || 0} I:${attendance?.izin || 0} S:${
    attendance?.sakit || 0
  } A:${attendance?.alpa || 0})`;
};

const AcademicReport = () => {
  const defaultMonth = useMemo(() => getDefaultPublishedMonth(), []);
  const [studentId, setStudentId] = useState("");
  const [month, setMonth] = useState(defaultMonth);
  const [semester, setSemester] = useState(() =>
    deriveSemesterFromMonth(defaultMonth),
  );

  const { data, isFetching, isLoading, isError, error } =
    useGetParentAcademicReportQuery({
      student_id: studentId || null,
      semester: semester || null,
      month: month || null,
    });

  const students = data?.data?.students || [];
  const reports = data?.data?.reports || [];

  const effectiveStudentId = useMemo(() => {
    return studentId || String(data?.data?.filters?.selected_student_id || "");
  }, [studentId, data?.data?.filters?.selected_student_id]);

  const selectedStudent = useMemo(() => {
    if (!effectiveStudentId) return null;
    return (
      students.find(
        (item) => String(item.student_id) === String(effectiveStudentId),
      ) || null
    );
  }, [students, effectiveStudentId]);

  const summary = useMemo(() => {
    if (!reports.length) {
      return {
        subjects: 0,
        avgAttendanceRate: null,
        avgAttitude: null,
        avgFormative: null,
        avgSummative: null,
      };
    }

    const collect = (selector) =>
      reports
        .map(selector)
        .filter((item) => item !== null && item !== undefined)
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item));

    const avg = (items) =>
      items.length
        ? Number(
            (items.reduce((sum, val) => sum + val, 0) / items.length).toFixed(
              2,
            ),
          )
        : null;

    return {
      subjects: reports.length,
      avgAttendanceRate: avg(collect((item) => item.attendance?.rate)),
      avgAttitude: avg(collect((item) => item.attitude?.average)),
      avgFormative: avg(collect((item) => item.formative?.average)),
      avgSummative: avg(collect((item) => item.summative?.average)),
    };
  }, [reports]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ ...cardStyle, padding: 16 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "#eff8ff",
                color: "#1570ef",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Filter size={18} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#101828" }}>
                Filter Laporan Bulanan
              </div>
              <div style={{ fontSize: 13, color: "#667085" }}>
                Pilih siswa, semester, dan bulan untuk melihat rekap per mata
                pelajaran.
              </div>
            </div>
          </div>
          {isFetching ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "#667085",
              }}
            >
              <LoaderCircle
                size={16}
                style={{ animation: "spin 0.9s linear infinite" }}
              />
              Memuat...
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13, color: "#475467" }}>Siswa</span>
            <select
              value={effectiveStudentId}
              onChange={(event) => setStudentId(event.target.value)}
              style={{
                width: "100%",
                border: "1px solid #d0d5dd",
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 14,
                outline: "none",
                background: "#fff",
              }}
            >
              {students.map((item) => (
                <option key={item.student_id} value={String(item.student_id)}>
                  {item.student_name} - {item.class_name || "-"}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13, color: "#475467" }}>Semester</span>
            <select
              value={semester}
              onChange={(event) => setSemester(event.target.value)}
              style={{
                width: "100%",
                border: "1px solid #d0d5dd",
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 14,
                outline: "none",
                background: "#fff",
                color: "#344054",
                cursor: "pointer",
              }}
            >
              {SEMESTER_OPTIONS.map((item) => (
                <option key={item.value || "all"} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13, color: "#475467" }}>Bulan</span>
            <select
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              style={{
                width: "100%",
                border: "1px solid #d0d5dd",
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 14,
                outline: "none",
                background: "#fff",
              }}
            >
              {MONTH_OPTIONS.map((item) => (
                <option key={item.value || "all"} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 12,
        }}
      >
        <div style={{ ...cardStyle, padding: 14 }}>
          <div style={metricLabelStyle}>Siswa</div>
          <div style={{ ...metricValueStyle, fontSize: 15 }}>
            {selectedStudent?.student_name || "-"}
          </div>
          <div style={{ fontSize: 12, color: "#667085", marginTop: 4 }}>
            NIS {selectedStudent?.nis || "-"}
          </div>
        </div>

        <div style={{ ...cardStyle, padding: 14 }}>
          <div style={metricLabelStyle}>Mata Pelajaran</div>
          <div style={metricValueStyle}>{summary.subjects}</div>
        </div>

        <div style={{ ...cardStyle, padding: 14 }}>
          <div style={metricLabelStyle}>Rata-rata Kehadiran</div>
          <div style={metricValueStyle}>
            {summary.avgAttendanceRate === null
              ? "-"
              : `${summary.avgAttendanceRate}%`}
          </div>
        </div>

        <div style={{ ...cardStyle, padding: 14 }}>
          <div style={metricLabelStyle}>Nilai Sikap</div>
          <div style={metricValueStyle}>
            {toFixedOrDash(summary.avgAttitude)}
          </div>
        </div>

        <div style={{ ...cardStyle, padding: 14 }}>
          <div style={metricLabelStyle}>Nilai Formatif</div>
          <div style={metricValueStyle}>
            {toFixedOrDash(summary.avgFormative)}
          </div>
        </div>

        <div style={{ ...cardStyle, padding: 14 }}>
          <div style={metricLabelStyle}>Nilai Sumatif</div>
          <div style={metricValueStyle}>
            {toFixedOrDash(summary.avgSummative)}
          </div>
        </div>
      </div>

      <div
        className="report-desktop-table"
        style={{ ...cardStyle, padding: 12, overflowX: "auto" }}
      >
        <table
          style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}
        >
          <thead>
            <tr style={{ background: "#f9fafb", textAlign: "left" }}>
              <th style={{ padding: 12, fontSize: 12, color: "#475467" }}>
                Mata Pelajaran
              </th>
              <th style={{ padding: 12, fontSize: 12, color: "#475467" }}>
                Kehadiran
              </th>
              <th style={{ padding: 12, fontSize: 12, color: "#475467" }}>
                Nilai Sikap
              </th>
              <th style={{ padding: 12, fontSize: 12, color: "#475467" }}>
                Nilai Formatif
              </th>
              <th style={{ padding: 12, fontSize: 12, color: "#475467" }}>
                Nilai Sumatif
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} style={{ padding: 18, color: "#667085" }}>
                  Memuat laporan...
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={5} style={{ padding: 18, color: "#b42318" }}>
                  {error?.data?.message || "Gagal memuat laporan akademik."}
                </td>
              </tr>
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 18, color: "#667085" }}>
                  Data laporan tidak tersedia untuk filter saat ini.
                </td>
              </tr>
            ) : (
              reports.map((item) => (
                <tr
                  key={item.subject_id}
                  style={{ borderTop: "1px solid #eaecf0" }}
                >
                  <td style={{ padding: 12 }}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <BookOpen size={15} color="#1570ef" />
                      <div>
                        <div style={{ fontWeight: 600, color: "#101828" }}>
                          {item.subject_name}
                        </div>
                        <div style={{ fontSize: 12, color: "#667085" }}>
                          {item.subject_code || "-"}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td style={{ padding: 12 }}>
                    <div style={{ display: "grid", gap: 2, fontSize: 13 }}>
                      <div style={{ color: "#101828", fontWeight: 600 }}>
                        {item.attendance?.rate === null
                          ? "-"
                          : `${Number(item.attendance.rate).toFixed(2)}%`}
                      </div>
                      <div style={{ color: "#667085" }}>
                        H:{item.attendance?.hadir || 0} I:
                        {item.attendance?.izin || 0} S:
                        {item.attendance?.sakit || 0} A:
                        {item.attendance?.alpa || 0}
                      </div>
                    </div>
                  </td>

                  <td style={{ padding: 12 }}>
                    <div style={{ display: "grid", gap: 4 }}>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontWeight: 600,
                          color: "#101828",
                        }}
                      >
                        <UserRound size={14} />
                        {toFixedOrDash(item.attitude?.average)}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#667085",
                          maxWidth: 260,
                        }}
                      >
                        {item.attitude?.note || "-"}
                      </div>
                    </div>
                  </td>

                  <td style={{ padding: 12 }}>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <ClipboardCheck size={14} />
                      <span style={{ fontWeight: 600, color: "#101828" }}>
                        {toFixedOrDash(item.formative?.average)}
                      </span>
                      <span style={{ fontSize: 12, color: "#667085" }}>
                        ({item.formative?.items || 0} item)
                      </span>
                    </div>
                  </td>

                  <td style={{ padding: 12 }}>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <GraduationCap size={14} />
                      <span style={{ fontWeight: 600, color: "#101828" }}>
                        {toFixedOrDash(item.summative?.average)}
                      </span>
                      <span style={{ fontSize: 12, color: "#667085" }}>
                        ({item.summative?.items || 0} item)
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="report-mobile-list" style={{ display: "none", gap: 12 }}>
        {isLoading ? (
          <div style={{ ...cardStyle, padding: 14, color: "#667085" }}>
            Memuat laporan...
          </div>
        ) : isError ? (
          <div style={{ ...cardStyle, padding: 14, color: "#b42318" }}>
            {error?.data?.message || "Gagal memuat laporan akademik."}
          </div>
        ) : reports.length === 0 ? (
          <div style={{ ...cardStyle, padding: 14, color: "#667085" }}>
            Data laporan tidak tersedia untuk filter saat ini.
          </div>
        ) : (
          reports.map((item) => (
            <div
              key={`m-${item.subject_id}`}
              style={{ ...cardStyle, padding: 14 }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <BookOpen size={15} color="#1570ef" />
                <div>
                  <div
                    style={{ fontWeight: 700, color: "#101828", fontSize: 14 }}
                  >
                    {item.subject_name}
                  </div>
                  <div style={{ fontSize: 12, color: "#667085" }}>
                    {item.subject_code || "-"}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <div>
                  <div style={metricLabelStyle}>Kehadiran</div>
                  <div
                    style={{ fontSize: 13, color: "#101828", fontWeight: 600 }}
                  >
                    {renderAttendanceText(item.attendance)}
                  </div>
                </div>
                <div>
                  <div style={metricLabelStyle}>Nilai Sikap</div>
                  <div
                    style={{ fontSize: 13, color: "#101828", fontWeight: 600 }}
                  >
                    {toFixedOrDash(item.attitude?.average)}
                  </div>
                  <div style={{ fontSize: 12, color: "#667085", marginTop: 2 }}>
                    {item.attitude?.note || "-"}
                  </div>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                  }}
                >
                  <div>
                    <div style={metricLabelStyle}>Formatif</div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "#101828",
                        fontWeight: 600,
                      }}
                    >
                      {toFixedOrDash(item.formative?.average)} (
                      {item.formative?.items || 0})
                    </div>
                  </div>
                  <div>
                    <div style={metricLabelStyle}>Sumatif</div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "#101828",
                        fontWeight: 600,
                      }}
                    >
                      {toFixedOrDash(item.summative?.average)} (
                      {item.summative?.items || 0})
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .report-desktop-table {
            display: none;
          }

          .report-mobile-list {
            display: grid !important;
          }
        }
      `}</style>
    </div>
  );
};

export default AcademicReport;

import { Avatar, Button, Empty, Flex, Grid, Progress, Skeleton, Tag, Typography } from "antd";
import { HeartHandshake, Pencil, School, User, Users } from "lucide-react";

import { CardTitle, MuseCard } from "../../../components/ui/muse";
import { museColors, museRadius } from "../../../config/theme";
import {
  formatDate,
  getFatherItems,
  getMotherItems,
  getPersonalItems,
  isFemale,
} from "./studentProfileUtils";

const { Text } = Typography;
const { useBreakpoint } = Grid;

export const StudentAvatar = ({ gender, size = 40 }) => (
  <Avatar
    size={size}
    icon={<User size={Math.round(size / 2)} />}
    style={{
      background: isFemale(gender) ? museColors.female : museColors.primary,
      flexShrink: 0,
    }}
  />
);

export const CompletionTag = ({ status }) => (
  <Tag color={status === "Terisi" ? "success" : "warning"} style={{ margin: 0 }}>
    {status || "Belum Terisi"}
  </Tag>
);

export const CompletionBar = ({ percent = 0, showInfo = true }) => (
  <Progress
    percent={percent}
    size={{ height: 3 }}
    showInfo={showInfo}
    strokeColor={percent === 100 ? museColors.success : museColors.primary}
    railColor={museColors.divider}
  />
);

/** Grid label / nilai yang menyesuaikan lebar layar. */
export const InfoGrid = ({ items, min = 200 }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: `repeat(auto-fill, minmax(min(${min}px, 100%), 1fr))`,
      gap: 12,
    }}
  >
    {items.map((item) => (
      <div
        key={item.label}
        style={{
          gridColumn: item.wide ? "1 / -1" : undefined,
          padding: "10px 12px",
          borderRadius: museRadius.item,
          background: museColors.bgLayout,
          minWidth: 0,
        }}
      >
        <Text
          style={{
            display: "block",
            fontSize: 12,
            fontWeight: 600,
            color: museColors.muted,
            marginBottom: 2,
          }}
        >
          {item.label}
        </Text>
        <Text strong style={{ display: "block", wordBreak: "break-word" }}>
          {item.value === 0 ? 0 : item.value || "-"}
        </Text>
      </div>
    ))}
  </div>
);

const SubHeading = ({ children }) => (
  <Text
    style={{
      display: "block",
      fontSize: 12,
      fontWeight: 700,
      color: museColors.muted,
      textTransform: "uppercase",
      letterSpacing: 0.4,
      margin: "4px 0 8px",
    }}
  >
    {children}
  </Text>
);

export const SiblingList = ({ siblings = [] }) => {
  if (!siblings.length) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description='Belum ada anggota keluarga. Tambahkan lewat tombol Perbarui Data.'
      />
    );
  }

  return (
    <Flex vertical gap={8}>
      {siblings.map((item, index) => (
        <Flex
          key={item.id || `${item.name}-${index}`}
          align='center'
          gap={12}
          style={{
            padding: "10px 12px",
            borderRadius: museRadius.item,
            border: `1px solid ${museColors.divider}`,
            minWidth: 0,
          }}
        >
          <StudentAvatar gender={item.gender} size={36} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text strong ellipsis style={{ display: "block" }}>
              {item.name || "-"}
            </Text>
            <Text type='secondary' style={{ fontSize: 12 }}>
              Lahir {formatDate(item.birth_date)}
            </Text>
          </div>
          {item.gender ? (
            <Tag color={isFemale(item.gender) ? "magenta" : "blue"} style={{ margin: 0 }}>
              {item.gender}
            </Tag>
          ) : null}
        </Flex>
      ))}
    </Flex>
  );
};

/** Tiga card bagian data: pribadi, orang tua, keluarga. */
export const StudentProfileSections = ({ student, loading }) => {
  if (loading) {
    return (
      <Flex vertical gap={24}>
        {[0, 1].map((key) => (
          <MuseCard key={key}>
            <Skeleton active paragraph={{ rows: 5 }} />
          </MuseCard>
        ))}
      </Flex>
    );
  }

  if (!student) return null;

  return (
    <Flex vertical gap={24} style={{ minWidth: 0 }}>
      <MuseCard
        title={
          <CardTitle
            icon={<School size={16} />}
            title='Informasi Pribadi'
            description='Identitas dan data akademik siswa.'
          />
        }
      >
        <InfoGrid items={getPersonalItems(student)} />
      </MuseCard>

      <MuseCard
        title={
          <CardTitle
            icon={<HeartHandshake size={16} />}
            title='Informasi Orang Tua'
            description='Data ayah dan ibu untuk administrasi sekolah.'
          />
        }
      >
        <SubHeading>Ayah</SubHeading>
        <InfoGrid items={getFatherItems(student)} />
        <div style={{ height: 16 }} />
        <SubHeading>Ibu</SubHeading>
        <InfoGrid items={getMotherItems(student)} />
      </MuseCard>

      <MuseCard
        title={
          <CardTitle
            icon={<Users size={16} />}
            title='Anggota Keluarga Lain'
            description={`${student.siblings?.length || 0} data selain orang tua.`}
          />
        }
      >
        <SiblingList siblings={student.siblings} />
      </MuseCard>
    </Flex>
  );
};

/** Kartu ringkas profil: avatar, nama, kelas, status & kelengkapan. */
export const StudentSummaryCard = ({ student, loading, onEdit, editLabel = "Perbarui Data", children }) => {
  if (loading) {
    return (
      <MuseCard>
        <Skeleton avatar active paragraph={{ rows: 3 }} />
      </MuseCard>
    );
  }

  const percent = student?.completion_percent || 0;

  return (
    <MuseCard>
      <Flex vertical gap={16}>
        <Flex align='center' gap={12} style={{ minWidth: 0 }}>
          <StudentAvatar gender={student?.gender} size={56} />
          <div style={{ minWidth: 0 }}>
            <Text strong ellipsis style={{ display: "block", fontSize: 16 }}>
              {student?.full_name || "-"}
            </Text>
            <Text type='secondary' style={{ fontSize: 12, display: "block" }}>
              NIS {student?.nis || "-"}
              {student?.nisn ? ` · NISN ${student.nisn}` : ""}
            </Text>
            <Text type='secondary' style={{ fontSize: 12, display: "block" }}>
              {[student?.grade_name, student?.class_name].filter(Boolean).join(" · ") || "Kelas belum diatur"}
            </Text>
          </div>
        </Flex>

        <div>
          <Flex justify='space-between' align='center' gap={8} style={{ marginBottom: 4 }}>
            <Text style={{ fontWeight: 600, color: museColors.muted }}>Kelengkapan data</Text>
            <CompletionTag status={student?.completion_status} />
          </Flex>
          <CompletionBar percent={percent} />
          <Text type='secondary' style={{ fontSize: 12 }}>
            {percent === 100
              ? "Profil sudah lengkap."
              : "Lengkapi data pribadi, orang tua, dan minimal 1 anggota keluarga."}
          </Text>
        </div>

        {children}

        {onEdit ? (
          <Button type='primary' block icon={<Pencil size={16} />} onClick={onEdit} disabled={!student}>
            {editLabel}
          </Button>
        ) : null}
      </Flex>
    </MuseCard>
  );
};

/** Layout profil: ringkasan di kiri (sticky di desktop), bagian data di kanan. */
export const StudentProfileLayout = ({ aside, children }) => {
  const screens = useBreakpoint();
  const isDesktop = screens.lg;

  return (
    <div
      style={{
        display: "grid",
        gap: isDesktop ? 24 : 16,
        gridTemplateColumns: isDesktop ? "320px minmax(0, 1fr)" : "minmax(0, 1fr)",
        alignItems: "start",
      }}
    >
      <div style={isDesktop ? { position: "sticky", top: 96 } : undefined}>{aside}</div>
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  );
};

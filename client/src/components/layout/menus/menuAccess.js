// Aturan generik menu sidebar. File ini milik `main`.
//
// Feature TIDAK perlu mengedit AppLayout atau file ini untuk aturan domainnya.
// Atur visibilitas langsung di item menu domain:
//
//   { key: "/manajemen-piket", label: "Piket", icon: <X />,
//     visible: (user) => user?.has_duty_today || user?.can_manage_kurikulum }
//
// Flag lama `requiresHomeroom` dan `requiresAttendanceOfficer` tetap didukung.

const isFinanceLevel = (level) => level === "finance" || level === "keuangan";

// Properti item menu yang hanya dipakai di sini, tidak diteruskan ke antd Menu.
const ACCESS_KEYS = ["visible", "requiresHomeroom", "requiresAttendanceOfficer"];

const isItemVisible = (item, user) => {
  if (item.requiresHomeroom && !user?.is_homeroom) return false;
  if (item.requiresAttendanceOfficer && !user?.is_attendance_officer) {
    return false;
  }
  if (typeof item.visible === "function" && !item.visible(user)) return false;
  return true;
};

const stripAccessKeys = (item) => {
  const next = { ...item };
  ACCESS_KEYS.forEach((key) => delete next[key]);
  return next;
};

export const filterMenuItemsByUser = (items = [], user) =>
  items
    .map((item) => {
      if (!item || !isItemVisible(item, user)) return null;

      const next = stripAccessKeys(item);
      if (Array.isArray(item.children)) {
        const children = filterMenuItemsByUser(item.children, user);
        if (children.length === 0) return null;
        next.children = children;
      }
      return next;
    })
    .filter(Boolean);

// Kunci grup menu (di menus/index.js) untuk user yang sedang login.
export const resolveMenuRole = (user) => {
  if (!user?.role) return null;
  if (user.role !== "admin") return user.role;
  if (user.level === "pusat") return "center";
  if (user.level === "tahfiz") return "tahfiz";
  if (isFinanceLevel(user.level)) return "finance";
  return "admin";
};

const collectKeys = (items = [], keys = []) => {
  items.forEach((item) => {
    if (typeof item?.key === "string" && item.key.startsWith("/")) {
      keys.push(item.key);
    }
    if (Array.isArray(item?.children)) collectKeys(item.children, keys);
  });
  return keys;
};

// Item aktif = kunci menu terpanjang yang menjadi awalan path, sehingga
// halaman turunan (mis. /keuangan/12/rapbs) tetap menyorot menu induknya.
export const resolveSelectedMenuKey = (items, pathname) => {
  let match = null;
  collectKeys(items).forEach((key) => {
    const isPrefix =
      pathname === key || (key !== "/" && pathname.startsWith(`${key}/`));
    if (isPrefix && (!match || key.length > match.length)) match = key;
  });
  return match || pathname;
};

import { Flex, Typography } from "antd";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { CardTitle, IconBox, MuseCard } from "../../../components/ui/muse";
import { museColors } from "../../../config/theme";

const { Text } = Typography;

/** Daftar tautan cepat. links: [{ key, label, description?, to, icon }] */
const QuickLinksCard = ({ title = "Akses Cepat", links }) => {
  const navigate = useNavigate();
  const visible = links.filter(Boolean);
  if (!visible.length) return null;

  return (
    <MuseCard flush title={<CardTitle title={title} />}>
      {visible.map((link, index) => (
        <a
          key={link.key}
          href={link.to}
          onClick={(event) => {
            event.preventDefault();
            navigate(link.to);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 24px",
            borderTop: index === 0 ? 0 : `1px solid ${museColors.divider}`,
            color: museColors.text,
          }}
        >
          <IconBox icon={link.icon} tone='primarySoft' size={32} />
          <Flex vertical style={{ flex: 1, minWidth: 0 }}>
            <Text strong ellipsis>
              {link.label}
            </Text>
            {link.description ? (
              <Text type='secondary' ellipsis style={{ fontSize: 12 }}>
                {link.description}
              </Text>
            ) : null}
          </Flex>
          <ChevronRight size={16} color={museColors.muted} aria-hidden />
        </a>
      ))}
    </MuseCard>
  );
};

export default QuickLinksCard;

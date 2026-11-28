import React from "react";
import { Card, Flex, Modal, Typography } from "antd";
import { motion } from "framer-motion";

import { museColors, museRadius } from "../../../../config/theme";
const { Text } = Typography;

const modalMotionProps = {
  initial: { opacity: 0, y: 14, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
};

const modalStyles = {
  header: {
    paddingBottom: 18,
    marginBottom: 0,
    borderBottom: `1px solid ${museColors.divider}`,
  },
  body: {
    paddingTop: 20,
    paddingBottom: 20,
    overflow: "visible",
  },
  footer: {
    borderTop: `1px solid ${museColors.divider}`,
    paddingTop: 16,
    marginTop: 0,
  },
};

const renderModalTitle = (title, subtitle) => (
  <Flex vertical gap={4}>
    <Text strong style={{ fontSize: 18, color: museColors.text }}>
      {title}
    </Text>
    <Text type='secondary' style={{ fontSize: 13 }}>
      {subtitle}
    </Text>
  </Flex>
);

const TeacherDutyFormModal = ({
  title,
  subtitle,
  open,
  onCancel,
  onOk,
  okText,
  width,
  isMobile,
  helperTitle,
  helperDescription,
  children,
}) => (
  <Modal
    title={renderModalTitle(title, subtitle)}
    open={open}
    onCancel={onCancel}
    onOk={onOk}
    okText={okText}
    width={isMobile ? "calc(100vw - 24px)" : width}
    centered
    styles={modalStyles}
    okButtonProps={{
      style: {
        borderRadius: 12,
        minWidth: 116,
        boxShadow: "0 10px 24px rgba(37, 99, 235, 0.18)",
      },
    }}
    cancelButtonProps={{
      style: {
        borderRadius: 12,
        minWidth: 92,
      },
    }}
    modalRender={(node) => <motion.div {...modalMotionProps}>{node}</motion.div>}
  >
    <Flex vertical gap={16}>
      <Card
        size='small'
        style={{
          borderRadius: museRadius.card,
          border: `1px solid ${museColors.divider}`,
          background: museColors.bgLayout,
        }}
        styles={{ body: { padding: 16 } }}
      >
        <Flex vertical gap={8}>
          <Text strong style={{ color: museColors.text }}>
            {helperTitle}
          </Text>
          <Text type='secondary' style={{ fontSize: 13 }}>
            {helperDescription}
          </Text>
        </Flex>
      </Card>

      {children}
    </Flex>
  </Modal>
);

export default TeacherDutyFormModal;

import React from "react";
import { Button, Card, Empty, Flex, List, Space, Tag, Typography } from "antd";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import {
  cardHeadStyles,
  cardStyle,
  listItemStyle,
  slideVariants,
} from "./studentDashStyles";

const { Text } = Typography;

const SubjectPager = ({
  safePage,
  totalPages,
  onPrev,
  onNext,
}) => (
  <Space size={8} style={{ flexShrink: 0 }}>
    <Button
      size='small'
      shape='circle'
      icon={<ChevronLeft size={16} />}
      disabled={safePage === 0}
      onClick={onPrev}
    />
    <Text type='secondary' style={{ minWidth: 36, textAlign: "center" }}>
      {safePage + 1}/{totalPages}
    </Text>
    <Button
      size='small'
      shape='circle'
      icon={<ChevronRight size={16} />}
      disabled={safePage === totalPages - 1}
      onClick={onNext}
    />
  </Space>
);

const SubjectListItem = ({ item, stackLayout, isXs }) => (
  <List.Item
    style={{
      ...listItemStyle,
      padding: isXs ? "12px 12px" : "14px 16px",
      marginBottom: isXs ? 10 : 12,
    }}
  >
    <Flex
      justify='space-between'
      align={stackLayout ? "flex-start" : "center"}
      gap={12}
      vertical={stackLayout}
      style={{ width: "100%", minWidth: 0 }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <Text
          strong
          style={{
            color: "#0f172a",
            display: "block",
            wordBreak: "break-word",
            fontSize: isXs ? 14 : 15,
          }}
        >
          {item.name}
        </Text>
        <Text type='secondary' style={{ fontSize: isXs ? 12 : 13 }}>
          {item.code || "Kode mata pelajaran belum tersedia"}
        </Text>
      </div>
      <Tag
        color='blue'
        style={{
          borderRadius: 999,
          marginInlineEnd: 0,
          flexShrink: 0,
        }}
      >
        Mapel
      </Tag>
    </Flex>
  </List.Item>
);

const StudentSubjectsCard = ({
  subjects,
  pagedSubjects,
  safePage,
  totalPages,
  subjectsPerPage,
  onPrev,
  onNext,
  isMobile,
  isXs,
}) => {
  const showPager = subjects.length > subjectsPerPage;
  const pager = showPager ? (
    <SubjectPager
      safePage={safePage}
      totalPages={totalPages}
      onPrev={onPrev}
      onNext={onNext}
    />
  ) : null;

  return (
    <Card
      variant='borderless'
      style={cardStyle}
      styles={cardHeadStyles({ isMobile, isXs })}
      title={
        <Flex
          align='center'
          justify='space-between'
          gap={8}
          wrap='wrap'
          style={{ width: "100%", minWidth: 0 }}
        >
          <Space size={8} style={{ minWidth: 0 }}>
            <BookOpen size={18} style={{ flexShrink: 0 }} />
            <span style={{ fontWeight: 700, fontSize: isXs ? 14 : 15 }}>
              Mata Pelajaran
            </span>
          </Space>
          {isMobile ? pager : null}
        </Flex>
      }
      extra={!isMobile ? pager : null}
    >
      {subjects.length ? (
        <AnimatePresence mode='wait'>
          <motion.div
            key={`${safePage}-${subjectsPerPage}`}
            variants={slideVariants}
            initial='initial'
            animate='animate'
            exit='exit'
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <List
              dataSource={pagedSubjects}
              split={false}
              renderItem={(item) => (
                <SubjectListItem
                  item={item}
                  stackLayout={isXs}
                  isXs={isXs}
                />
              )}
            />
          </motion.div>
        </AnimatePresence>
      ) : (
        <Empty description='Daftar mata pelajaran belum tersedia.' />
      )}
    </Card>
  );
};

export default StudentSubjectsCard;

import React, { useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { AppLayout } from "../../../../components";
import {
  Empty,
  Collapse,
  Checkbox,
  message,
  Spin,
  Popconfirm,
  Flex,
  theme,
  Typography,
  Button,
  Tooltip,
  Modal,
  Space,
  Tag,
  Grid,
} from "antd";
import { Edit3, Trash2, AlertTriangle } from "lucide-react";
import {
  useGetQuestionsQuery,
  useDeleteQuestionMutation,
  useBulkDeleteQuestionsMutation,
} from "../../../../service/cbt/ApiQuestion";

import QuestionHeader from "./QuestionHeader";
import QuestionBulkActions from "./QuestionBulkActions";
import QuestionItem from "./QuestionItem";
import { QuestionForm } from "../components";
import ImportExcelModal from "./ImportExcelModal";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const getQuestionTypeName = (type) => {
  const types = {
    1: { label: "PG Tunggal", color: "blue" },
    2: { label: "PG Multi", color: "cyan" },
    3: { label: "Essay Uraian", color: "purple" },
    4: { label: "Essay Singkat", color: "geekblue" },
    5: { label: "Benar / Salah", color: "orange" },
    6: { label: "Mencocokkan", color: "magenta" },
  };
  return types[type] || { label: "Unknown", color: "default" };
};

const QuestionsList = () => {
  const screens = useBreakpoint();

  const { token } = theme.useToken();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bankId = searchParams.get("bank_id");
  const bankName = searchParams.get("bank_name");

  const [selectedIds, setSelectedIds] = useState([]);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // API Hooks
  const {
    data: questions = [],
    isLoading,
    refetch,
  } = useGetQuestionsQuery({ bankid: bankId }, { skip: !bankId });
  const [deleteQuestion] = useDeleteQuestionMutation();
  const [bulkDelete] = useBulkDeleteQuestionsMutation();

  const totalScore = useMemo(
    () => questions.reduce((acc, curr) => acc + (curr.score_point || 0), 0),
    [questions],
  );

  const handleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  // FUNGSI: Hapus Satu Soal
  const handleDeleteSingle = async (id) => {
    try {
      await deleteQuestion(id).unwrap();
      message.success("Soal berhasil dihapus");
      setSelectedIds((prev) => prev.filter((item) => item !== id));
      refetch();
    } catch (err) {
      message.error("Gagal menghapus soal");
    }
  };

  // FUNGSI: Hapus Soal yang Dipilih (Bulk Delete)
  const handleBulkDelete = () => {
    Modal.confirm({
      title: `Hapus ${selectedIds.length} soal terpilih?`,
      icon: <AlertTriangle color="red" />,
      content: "Tindakan ini tidak dapat dibatalkan.",
      okText: "Hapus",
      okType: "danger",
      cancelText: "Batal",
      onOk: async () => {
        try {
          await bulkDelete(selectedIds).unwrap();
          message.success(`${selectedIds.length} soal berhasil dihapus`);
          setSelectedIds([]);
          refetch();
        } catch (err) {
          message.error("Gagal menghapus beberapa soal");
        }
      },
    });
  };

  // FUNGSI: Hapus Semua Soal dalam Bank
  const handleDeleteAll = () => {
    const allIds = questions.map((q) => q.id);
    if (allIds.length === 0) return;

    Modal.confirm({
      title: "Kosongkan semua soal?",
      icon: <AlertTriangle color="red" />,
      content: `Anda akan menghapus seluruh soal (${allIds.length} soal) dalam bank ini.`,
      okText: "Ya, Hapus Semua",
      okType: "danger",
      cancelText: "Batal",
      onOk: async () => {
        try {
          await bulkDelete(allIds).unwrap();
          message.success("Semua soal berhasil dihapus");
          setSelectedIds([]);
          refetch();
        } catch (err) {
          message.error("Gagal mengosongkan soal");
        }
      },
    });
  };

  if (isFormVisible)
    return (
      <QuestionForm
        bankId={bankId}
        initialData={editingItem}
        onCancel={() => setIsFormVisible(false)}
        onSaveSuccess={() => {
          setIsFormVisible(false);
          refetch();
        }}
      />
    );

  return (
    <>
      <QuestionHeader
        bankName={bankName}
        totalCount={questions.length}
        totalScore={totalScore}
        onBack={() => navigate("/computer-based-test/bank")}
        onImport={() => setIsImportModalOpen(true)}
        onAdd={() => {
          setEditingItem(null);
          setIsFormVisible(true);
        }}
        onDeleteAll={handleDeleteAll}
      />

      <QuestionBulkActions
        selectedCount={selectedIds.length}
        onCancel={() => setSelectedIds([])}
        onDelete={handleBulkDelete}
      />

      {isLoading ? (
        <Flex justify="center" align="center" style={{ minHeight: 400 }}>
          <Spin size="large" />
        </Flex>
      ) : (
        <Collapse
          accordion
          ghost
          expandIconPlacement="end"
          items={questions.map((q, index) => ({
            key: q.id,
            label: (
              <Flex
                align="center"
                gap={12}
                onClick={(e) => e.stopPropagation()}
                style={{ width: "100%", overflow: "hidden" }} // Mencegah overflow
              >
                <Checkbox
                  checked={selectedIds.includes(q.id)}
                  onChange={() => handleSelect(q.id)}
                  style={{ flexShrink: 0 }}
                />

                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Container utama teks */}
                  <Flex vertical gap={4}>
                    <Flex gap={8} align="center">
                      <Text strong style={{ color: token.colorPrimary }}>
                        {index + 1}.
                      </Text>
                      <Flex gap={4} wrap="wrap">
                        <Tag
                          color={getQuestionTypeName(q.q_type).color}
                          style={{ fontSize: "10px", margin: 0 }}
                        >
                          {getQuestionTypeName(q.q_type).label}
                        </Tag>
                        <Tag style={{ fontSize: "10px", margin: 0 }}>
                          {q.score_point} Pts
                        </Tag>
                      </Flex>
                    </Flex>
                    <Text
                      ellipsis
                      type="secondary"
                      style={{ fontSize: "13px", display: "block" }}
                    >
                      {q.content
                        ?.replace(/<[^>]*>/g, "")
                        ?.replace(/&nbsp;/g, " ")
                        .substring(0, screens.sm ? 100 : 30)}
                    </Text>
                  </Flex>
                </div>

                <Space
                  size={4}
                  onClick={(e) => e.stopPropagation()}
                  style={{ flexShrink: 0 }}
                >
                  <Button
                    type="text"
                    size="small"
                    icon={<Edit3 size={16} />}
                    onClick={() => {
                      setEditingItem(q);
                      setIsFormVisible(true);
                    }}
                  />
                  <Popconfirm
                    title="Hapus?"
                    onConfirm={() => handleDeleteSingle(q.id)}
                  >
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<Trash2 size={16} />}
                    />
                  </Popconfirm>
                </Space>
              </Flex>
            ),
            children: (
              <div style={{ padding: "0 4px 12px 32px" }}>
                <QuestionItem question={q} />
              </div>
            ),
            style: {
              background: "#fff",
              borderRadius: 12,
              marginBottom: 12,
              border: "1px solid #f0f0f0",
            },
          }))}
        />
      )}

      <ImportExcelModal
        visible={isImportModalOpen}
        onCancel={() => setIsImportModalOpen(false)}
        bankId={bankId}
        onSuccess={() => {
          refetch();
          setIsImportModalOpen(false);
        }}
      />
    </>
  );
};

export default QuestionsList;

import React, { useEffect, useMemo, useState } from "react";
import { Button, Flex, Input, Modal, Space, Tag, Typography, message } from "antd";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import {
  useCreateQuestionGroupMutation,
  useUpdateQuestionGroupMutation,
} from "../../../../service/cbt/ApiQuestion";
import TextEditor from "../components/question/TextEditor";

const { Text } = Typography;

const TYPE_LABELS = {
  1: "PG Tunggal",
  2: "PG Multi",
  3: "Uraian",
  4: "Isian Singkat",
  5: "Benar / Salah",
  6: "Menjodohkan",
};

const previewText = (value) =>
  String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const QuestionGroupModal = ({ open, bankId, questions, editor, onClose }) => {
  const [title, setTitle] = useState("");
  const [stimulus, setStimulus] = useState("");
  const [questionIds, setQuestionIds] = useState([]);
  const [createGroup, { isLoading: isCreating }] = useCreateQuestionGroupMutation();
  const [updateGroup, { isLoading: isUpdating }] = useUpdateQuestionGroupMutation();
  const isSaving = isCreating || isUpdating;

  useEffect(() => {
    if (!open || !editor) return;
    if (editor.mode === "edit") {
      const members = questions
        .filter((question) => question.group_id === editor.groupId)
        .sort((left, right) => (left.group_order || 0) - (right.group_order || 0));
      const first = members[0];
      setTitle(first?.group_title || "");
      setStimulus(first?.group_stimulus || "");
      setQuestionIds(members.map((question) => question.id));
      return;
    }
    setTitle("");
    setStimulus("");
    setQuestionIds(editor.questionIds || []);
  }, [editor, open, questions]);

  const questionById = useMemo(
    () => new Map(questions.map((question) => [question.id, question])),
    [questions],
  );

  const moveQuestion = (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= questionIds.length) return;
    setQuestionIds((current) => {
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  };

  const handleSave = async () => {
    if (questionIds.length < 2) {
      message.warning("Grup soal minimal berisi 2 soal");
      return;
    }
    const payload = {
      title,
      stimulus,
      question_ids: questionIds,
    };
    try {
      if (editor?.mode === "edit") {
        await updateGroup({ id: editor.groupId, ...payload }).unwrap();
        message.success("Grup soal berhasil diperbarui");
      } else {
        await createGroup({ bank_id: Number(bankId), ...payload }).unwrap();
        message.success("Grup soal berhasil dibuat");
      }
      onClose(true);
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan grup soal");
    }
  };

  return (
    <Modal
      title={editor?.mode === "edit" ? "Edit grup soal" : "Buat grup soal"}
      open={open}
      onCancel={() => onClose(false)}
      onOk={handleSave}
      okText="Simpan grup"
      cancelText="Batal"
      confirmLoading={isSaving}
      width={860}
      destroyOnHidden
    >
      <Flex vertical gap={14}>
        <Text type="secondary">
          Stimulus ini tampil bersama untuk semua soal dalam grup. Urutan di dalam grup tidak diacak.
        </Text>
        <div>
          <Text strong>Judul grup</Text>
          <Input
            value={title}
            maxLength={200}
            placeholder="Misalnya Bacaan 1"
            onChange={(event) => setTitle(event.target.value)}
            style={{ marginTop: 6 }}
          />
        </div>
        <TextEditor
          label="Stimulus"
          helper="Teks, gambar, atau grafik yang dipakai bersama oleh soal di grup ini."
          value={stimulus}
          onChange={setStimulus}
          height="280px"
          placeholder="Tulis bacaan, tempel gambar, atau grafik"
        />
        <Flex vertical gap={8}>
          <Text strong>Soal dalam grup</Text>
          {questionIds.map((id, index) => {
            const question = questionById.get(id);
            const preview = previewText(question?.content) || "Tanpa teks soal";
            return (
              <Flex
                key={id}
                align="center"
                justify="space-between"
                gap={8}
                style={{
                  border: "1px solid #e6edf7",
                  borderRadius: 12,
                  padding: "8px 10px",
                }}
              >
                <Flex vertical gap={4} style={{ minWidth: 0, flex: 1 }}>
                  <Space size={6} wrap>
                    <Tag color="blue" style={{ margin: 0 }}>
                      {index + 1}
                    </Tag>
                    <Tag style={{ margin: 0 }}>
                      {TYPE_LABELS[question?.q_type] || "Soal"}
                    </Tag>
                  </Space>
                  <Text ellipsis>{preview}</Text>
                </Flex>
                <Space size={4}>
                  <Button
                    size="small"
                    icon={<ArrowUp size={14} />}
                    disabled={index === 0}
                    onClick={() => moveQuestion(index, -1)}
                  />
                  <Button
                    size="small"
                    icon={<ArrowDown size={14} />}
                    disabled={index === questionIds.length - 1}
                    onClick={() => moveQuestion(index, 1)}
                  />
                  <Button
                    size="small"
                    danger
                    icon={<X size={14} />}
                    disabled={questionIds.length <= 2}
                    onClick={() =>
                      setQuestionIds((current) => current.filter((item) => item !== id))
                    }
                  />
                </Space>
              </Flex>
            );
          })}
        </Flex>
      </Flex>
    </Modal>
  );
};

export default QuestionGroupModal;

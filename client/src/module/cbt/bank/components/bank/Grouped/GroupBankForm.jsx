import React, { useEffect, useMemo, useState } from "react";
import { Button, Form, Space, Typography, message } from "antd";
import { useSelector } from "react-redux";
import {
  useCreateGroupedBankMutation,
  useGetBanksForGroupQuery,
  useGetQuestionsForGroupQuery,
  useGetTeachersQuery,
} from "../../../../../../service/cbt/ApiBank";
import RulesAlert from "./RulesAlert";
import GroupTitleField from "./GroupTitleField";
import TeacherSelectField from "./TeacherSelectField";
import BankSelectionTable from "./BankSelectionTable";
import QuestionSelectionTable from "./QuestionSelectionTable";
import GroupFormFooter from "./GroupFormFooter";

const { Text } = Typography;

const GroupBankForm = ({ onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === "admin";
  const titleValue = Form.useWatch("title", form);

  const [selectedTeacherId, setSelectedTeacherId] = useState(
    isAdmin ? null : user?.id,
  );
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [questionPointMap, setQuestionPointMap] = useState({});

  const { data: teachers, isLoading: loadingTeachers } = useGetTeachersQuery(
    undefined,
    { skip: !isAdmin },
  );

  const { data: banks = [], isFetching } = useGetBanksForGroupQuery(
    { teacher_id: selectedTeacherId },
    { skip: !selectedTeacherId },
  );

  const [createGroupedBank, { isLoading: isCreating }] =
    useCreateGroupedBankMutation();

  useEffect(() => {
    setSelectedRowKeys([]);
    setSelectedQuestionIds([]);
    setQuestionPointMap({});
  }, [selectedTeacherId]);

  const selectedBanks = useMemo(
    () => banks.filter((b) => selectedRowKeys.includes(b.id)),
    [banks, selectedRowKeys],
  );

  const bankIdsParam = useMemo(
    () => (selectedRowKeys.length ? selectedRowKeys.join(",") : ""),
    [selectedRowKeys],
  );

  const { data: questions = [], isFetching: loadingQuestions } =
    useGetQuestionsForGroupQuery(
      { bank_ids: bankIdsParam },
      { skip: !bankIdsParam },
    );

  useEffect(() => {
    setSelectedQuestionIds([]);
    setQuestionPointMap({});
  }, [bankIdsParam]);

  useEffect(() => {
    if (!questions.length) return;
    setQuestionPointMap((prev) => {
      const next = { ...prev };
      questions.forEach((q) => {
        if (!next[q.id]) next[q.id] = q.score_point || 1;
      });
      return next;
    });
  }, [questions]);

  const totalPoints = useMemo(
    () =>
      selectedQuestionIds.reduce(
        (acc, id) => acc + (questionPointMap[id] || 0),
        0,
      ),
    [selectedQuestionIds, questionPointMap],
  );

  const selectedBankCoverageOk = useMemo(() => {
    if (!selectedBanks.length) return false;
    const byBank = new Set();
    selectedQuestionIds.forEach((id) => {
      const q = questions.find((item) => item.id === id);
      if (q) byBank.add(q.bank_id);
    });
    return selectedBanks.every((b) => byBank.has(b.id));
  }, [selectedBanks, selectedQuestionIds, questions]);

  const canSubmit = useMemo(() => {
    if (!titleValue) return false;
    if (isAdmin && !selectedTeacherId) return false;
    if (selectedBanks.length < 2) return false;
    if (!selectedQuestionIds.length) return false;
    if (!selectedBankCoverageOk) return false;
    if (totalPoints !== 100) return false;
    return selectedQuestionIds.every((id) => (questionPointMap[id] || 0) > 0);
  }, [
    titleValue,
    isAdmin,
    selectedTeacherId,
    selectedBanks,
    selectedQuestionIds,
    selectedBankCoverageOk,
    questionPointMap,
    totalPoints,
  ]);

  const handleSubmit = async (values) => {
    try {
      const payload = {
        title: values.title,
        teacher_id: selectedTeacherId,
        bank_ids: selectedRowKeys,
        questions: selectedQuestionIds.map((id) => ({
          question_id: id,
          score_point: questionPointMap[id],
        })),
      };

      await createGroupedBank(payload).unwrap();
      message.success("Bank soal gabungan berhasil dibuat");
      form.resetFields();
      if (onSuccess) onSuccess();
    } catch (error) {
      message.error(error?.data?.message || "Gagal membuat bank gabungan");
    }
  };

  return (
    <Form form={form} layout="vertical" onFinish={handleSubmit}>
      <Space vertical size="large" style={{ width: "100%" }}>
        <RulesAlert />

        <GroupTitleField />

        {isAdmin && (
          <TeacherSelectField
            teachers={teachers}
            loading={loadingTeachers}
            selectedTeacherId={selectedTeacherId}
            onChange={setSelectedTeacherId}
          />
        )}

        <BankSelectionTable
          banks={banks}
          isFetching={isFetching}
          selectedBanksCount={selectedBanks.length}
          selectedRowKeys={selectedRowKeys}
          onSelectionChange={setSelectedRowKeys}
        />

        <QuestionSelectionTable
          questions={questions}
          loading={loadingQuestions}
          selectedQuestionIds={selectedQuestionIds}
          totalPoints={totalPoints}
          questionPointMap={questionPointMap}
          onQuestionSelectionChange={setSelectedQuestionIds}
          onPointChange={setQuestionPointMap}
          showCoverageWarning={
            !selectedBankCoverageOk && selectedQuestionIds.length > 0
          }
        />

        <GroupFormFooter
          totalPoints={totalPoints}
          onClose={onClose}
          isCreating={isCreating}
          canSubmit={canSubmit}
        />
      </Space>
    </Form>
  );
};

export default GroupBankForm;

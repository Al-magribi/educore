import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  Col,
  Divider,
  Empty,
  Grid,
  Layout,
  Row,
  Skeleton,
  Space,
  Tag,
  Typography,
} from "antd";
import { AlarmClock, BookOpenCheck, UserRound } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  useFinishStudentExamMutation,
  useGetStudentExamAnswersQuery,
  useGetStudentExamQuestionsQuery,
  useSaveStudentExamAnswerMutation,
} from "../../../../service/cbt/ApiExam";
import ProgressPanel from "../components/ProgressPanel";
import QuestionListPanel from "../components/QuestionListPanel";
import QuestionListModal from "../components/QuestionListModal";
import QuestionContent from "../components/QuestionContent";
import ExamActions from "../components/ExamActions";

const { Content } = Layout;
const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const formatTime = (seconds) => {
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;
  const pad = (value) => String(value).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
};

const ExamInterface = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth?.user);
  const screens = useBreakpoint();
  const isSmallScreen = !screens.md;
  const [isQuestionListOpen, setIsQuestionListOpen] = useState(false);
  const [openPanels, setOpenPanels] = useState({
    progress: true,
    daftar: true,
  });

  const examNameParam = searchParams.get("exam_name");
  const examId = searchParams.get("exam_id");

  const {
    data: examData,
    isLoading: isExamLoading,
    isError: isExamError,
    error: examError,
  } = useGetStudentExamQuestionsQuery({ exam_id: examId }, { skip: !examId });
  const { data: savedAnswers } = useGetStudentExamAnswersQuery(
    { exam_id: examId },
    { skip: !examId },
  );

  const examInfo = examData?.exam;
  const examName = examInfo?.name
    ? examInfo.name
    : examNameParam
      ? examNameParam.replaceAll("-", " ")
      : "Ujian Semester";

  useEffect(() => {
    document.title = examName;
  }, [examName]);

  useEffect(() => {
    if (!isExamError || !examError) return;
    if (examError?.status !== 403) return;
    const status = examError?.data?.status;
    if (status === "belum_masuk" || status === "selesai") {
      navigate("/siswa/jadwal-ujian");
    }
  }, [isExamError, examError, navigate]);

  const totalMinutes = examInfo?.duration_minutes || 90;
  const sessionStartAt = examInfo?.session?.start_at;
  const sessionEndAt = examInfo?.session?.end_at;
  const isCountdownReady = Boolean(
    user?.id &&
      examInfo?.id &&
      sessionStartAt &&
      !isExamLoading &&
      !isExamError,
  );
  const initialRemainingSeconds = useMemo(() => {
    if (!isCountdownReady) return null;
    if (sessionEndAt) {
      const endMs = new Date(sessionEndAt).getTime();
      if (!Number.isNaN(endMs)) {
        const diffSeconds = Math.round((endMs - Date.now()) / 1000);
        return Math.max(0, diffSeconds);
      }
    }
    const startMs = new Date(sessionStartAt).getTime();
    if (Number.isNaN(startMs)) return totalMinutes * 60;
    const endMs = startMs + totalMinutes * 60 * 1000;
    const diffSeconds = Math.round((endMs - Date.now()) / 1000);
    return Math.max(0, diffSeconds);
  }, [isCountdownReady, sessionEndAt, sessionStartAt, totalMinutes]);
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [finishExam] = useFinishStudentExamMutation();
  const [saveAnswer] = useSaveStudentExamAnswerMutation();
  const [isAutoFinishing, setIsAutoFinishing] = useState(false);

  useEffect(() => {
    if (!isCountdownReady) return;
    setRemainingSeconds(initialRemainingSeconds);
  }, [isCountdownReady, initialRemainingSeconds]);

  useEffect(() => {
    if (!isCountdownReady || typeof remainingSeconds !== "number") return;
    const timer = setInterval(() => {
      setRemainingSeconds((prev) =>
        typeof prev === "number" ? Math.max(0, prev - 1) : prev,
      );
    }, 1000);
    return () => clearInterval(timer);
  }, [isCountdownReady, remainingSeconds]);
  useEffect(() => {
    if (!isCountdownReady) return;
    if (remainingSeconds !== 0 || isAutoFinishing) return;
    if (!examId) return;
    setIsAutoFinishing(true);
    finishExam({ exam_id: examId }).finally(() => {
      setIsAutoFinishing(false);
    });
  }, [
    isCountdownReady,
    remainingSeconds,
    isAutoFinishing,
    examId,
    finishExam,
  ]);

  const questions = examData?.questions || [];
  const totalQuestions = questions.length;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [doubts, setDoubts] = useState({});
  const hasHydratedRef = useRef(false);
  const debounceTimersRef = useRef({});

  useEffect(() => {
    setCurrentIndex(0);
  }, [totalQuestions]);

  useEffect(() => {
    setAnswers({});
    setDoubts({});
    hasHydratedRef.current = false;
  }, [examId]);

  useEffect(() => {
    if (!Array.isArray(savedAnswers) || hasHydratedRef.current) return;
    const nextAnswers = {};
    const nextDoubts = {};
    savedAnswers.forEach((row) => {
      if (row?.answer_json !== null && row?.answer_json !== undefined) {
        nextAnswers[row.question_id] = row.answer_json;
      }
      if (row?.is_doubt) {
        nextDoubts[row.question_id] = true;
      }
    });
    setAnswers(nextAnswers);
    setDoubts(nextDoubts);
    hasHydratedRef.current = true;
  }, [savedAnswers]);

  useEffect(
    () => () => {
      Object.values(debounceTimersRef.current).forEach((timerId) =>
        clearTimeout(timerId),
      );
    },
    [],
  );

  const getStatusForQuestion = (questionId) => {
    if (doubts[questionId]) return "ragu";
    const answer = answers[questionId];
    if (Array.isArray(answer) ? answer.length > 0 : answer) {
      return "terjawab";
    }
    return "belum";
  };

  const questionMap = useMemo(
    () =>
      questions.map((question, index) => ({
        id: question.id,
        number: index + 1,
        status: getStatusForQuestion(question.id),
      })),
    [questions, answers, doubts],
  );

  const answeredCount = questionMap.filter(
    (question) => question.status === "terjawab",
  ).length;
  const doubtCount = questionMap.filter(
    (question) => question.status === "ragu",
  ).length;
  const unansweredCount = totalQuestions - answeredCount - doubtCount;
  const progressPercent =
    totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  const palette = {
    ink: "#0b1b3f",
    subtle: "#5b6b8a",
    surface: "#ffffff",
    border: "#e6edf7",
    brand: "#1f5eff",
    accent: "#14b8a6",
    warm: "#f59e0b",
    cool: "#0ea5e9",
  };

  const glassCard = {
    borderRadius: 16,
    border: `1px solid ${palette.border}`,
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
    background:
      "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,255,0.92) 100%)",
  };

  const togglePanel = (key) => {
    setOpenPanels((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const currentQuestion = questions[currentIndex];
  const canPrev = currentIndex > 0;
  const canNext = currentIndex < totalQuestions - 1;
  const isCurrentDoubt = currentQuestion
    ? Boolean(doubts[currentQuestion.id])
    : false;
  const showFinish =
    totalQuestions > 0 && answeredCount === totalQuestions;

  const handleSelectQuestion = (index) => {
    setCurrentIndex(index);
    if (isSmallScreen) {
      setIsQuestionListOpen(false);
    }
  };

  const handleToggleDoubt = () => {
    if (!currentQuestion) return;
    const nextValue = !doubts[currentQuestion.id];
    setDoubts((prev) => ({
      ...prev,
      [currentQuestion.id]: nextValue,
    }));
    if (examId) {
      saveAnswer({
        exam_id: examId,
        question_id: currentQuestion.id,
        is_doubt: nextValue,
      });
    }
  };

  const handleAnswerChange = (value) => {
    if (!currentQuestion) return;
    const questionId = currentQuestion.id;
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
    if (!examId) return;
    const isTextAnswer =
      currentQuestion.q_type === 3 || currentQuestion.q_type === 4;
    if (isTextAnswer) {
      if (debounceTimersRef.current[questionId]) {
        clearTimeout(debounceTimersRef.current[questionId]);
      }
      debounceTimersRef.current[questionId] = setTimeout(() => {
        saveAnswer({
          exam_id: examId,
          question_id: questionId,
          answer: value,
        });
      }, 500);
    } else {
      saveAnswer({
        exam_id: examId,
        question_id: questionId,
        answer: value,
      });
    }
  };

  return (
    <Layout
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 10% 10%, rgba(30, 94, 255, 0.16), transparent 45%), radial-gradient(circle at 90% 0%, rgba(20, 184, 166, 0.18), transparent 40%), linear-gradient(160deg, #f6f8ff 0%, #f9fbff 50%, #ffffff 100%)",
      }}
    >
      <Content
        style={{ padding: isSmallScreen ? "16px 14px 32px" : "24px 28px 48px" }}
      >
        <Space vertical size={18} style={{ width: "100%" }}>
          <Card
            style={{
              ...glassCard,
              background:
                "linear-gradient(130deg, rgba(31,94,255,0.12) 0%, rgba(14,165,233,0.08) 55%, rgba(255,255,255,0.96) 100%)",
            }}
          >
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} lg={8}>
                <Space align="center" size={12}>
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 14,
                      display: "grid",
                      placeItems: "center",
                      background:
                        "linear-gradient(145deg, #1f5eff 0%, #5aa0ff 100%)",
                      color: "#fff",
                      boxShadow: "0 10px 24px rgba(31,94,255,0.35)",
                    }}
                  >
                    <BookOpenCheck size={22} />
                  </div>
                  <div>
                    <Text
                      style={{
                        color: palette.subtle,
                        fontSize: 12,
                        letterSpacing: 0.4,
                        textTransform: "uppercase",
                      }}
                    >
                      Ujian Aktif
                    </Text>
                    <Title level={4} style={{ margin: 0, color: palette.ink }}>
                      {examName}
                    </Title>
                    <Text style={{ color: palette.subtle }}>
                      {examInfo?.subject_name || "Mata Pelajaran"} - ID{" "}
                      {examInfo?.id || examId || "-"}
                    </Text>
                  </div>
                </Space>
              </Col>
              <Col xs={24} lg={10}>
                <Space align="center" size={12}>
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 14,
                      display: "grid",
                      placeItems: "center",
                      background:
                        "linear-gradient(145deg, #0ea5e9 0%, #38bdf8 100%)",
                      color: "#fff",
                      boxShadow: "0 10px 24px rgba(14,165,233,0.3)",
                    }}
                  >
                    <UserRound size={20} />
                  </div>
                  <div>
                    <Text
                      style={{
                        color: palette.subtle,
                        fontSize: 12,
                        letterSpacing: 0.4,
                        textTransform: "uppercase",
                      }}
                    >
                      Peserta
                    </Text>
                    <Title level={5} style={{ margin: 0, color: palette.ink }}>
                      {user?.full_name || "-"}
                    </Title>
                    <Space size={8} wrap>
                      <Tag color="blue">{user?.nis || "-"}</Tag>
                      <Tag color="green">{user?.class_name || "-"}</Tag>
                      <Tag color="cyan">Mengerjakan</Tag>
                    </Space>
                  </div>
                </Space>
              </Col>
              <Col xs={24} lg={6}>
                <Card
                  style={{
                    borderRadius: 14,
                    background:
                      "linear-gradient(140deg, rgba(245,249,255,0.9) 0%, rgba(255,255,255,0.95) 100%)",
                    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
                  }}
                  styles={{ body: { padding: 14 } }}
                >
                  <Space align="center" size={12}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        display: "grid",
                        placeItems: "center",
                        background:
                          "linear-gradient(145deg, #f59e0b 0%, #fbbf24 100%)",
                        color: "#fff",
                      }}
                    >
                      <AlarmClock size={18} />
                    </div>
                    <div>
                      <Text
                        style={{
                          color: palette.subtle,
                          fontSize: 12,
                          textTransform: "uppercase",
                          letterSpacing: 0.3,
                        }}
                      >
                        Sisa Waktu
                      </Text>
                      <Title
                        level={4}
                        style={{ margin: 0, color: palette.ink }}
                      >
                        {typeof remainingSeconds === "number"
                          ? formatTime(remainingSeconds)
                          : "--:--:--"}
                      </Title>
                    </div>
                  </Space>
                </Card>
              </Col>
            </Row>
          </Card>

          <Row gutter={[16, 16]}>
            <Col xs={24} xl={6}>
              <Space orientation="vertical" size={12} style={{ width: "100%" }}>
                <ProgressPanel
                  open={openPanels.progress}
                  onToggle={() => togglePanel("progress")}
                  answeredCount={answeredCount}
                  doubtCount={doubtCount}
                  unansweredCount={unansweredCount}
                  progressPercent={progressPercent}
                  glassCard={glassCard}
                  palette={palette}
                />
                {!isSmallScreen && (
                  <QuestionListPanel
                    open={openPanels.daftar}
                    onToggle={() => togglePanel("daftar")}
                    questionMap={questionMap}
                    currentIndex={currentIndex}
                    onSelect={handleSelectQuestion}
                    glassCard={glassCard}
                  />
                )}
              </Space>
            </Col>

            <Col xs={24} xl={18}>
              <Card style={glassCard}>
                {isExamLoading ? (
                  <Skeleton active paragraph={{ rows: 6 }} />
                ) : isExamError ? (
                  <Empty description="Gagal memuat soal" />
                ) : (
                  <Space vertical size={18} style={{ width: "100%" }}>
                    <QuestionContent
                      question={currentQuestion}
                      totalQuestions={totalQuestions}
                      index={currentIndex}
                      isSmallScreen={isSmallScreen}
                      onOpenList={() => setIsQuestionListOpen(true)}
                      answerValue={answers[currentQuestion?.id]}
                      onAnswerChange={handleAnswerChange}
                      palette={palette}
                    />

                    <Divider style={{ margin: "4px 0" }} />

                    <ExamActions
                      isSmallScreen={isSmallScreen}
                      onToggleDoubt={handleToggleDoubt}
                      onPrev={() =>
                        setCurrentIndex((prev) => Math.max(0, prev - 1))
                      }
                      onNext={() =>
                        setCurrentIndex((prev) =>
                          Math.min(totalQuestions - 1, prev + 1),
                        )
                      }
                      canPrev={canPrev}
                      canNext={canNext}
                      isDoubt={isCurrentDoubt}
                      showFinish={showFinish}
                      onFinish={() => {
                        if (!examId) return;
                        finishExam({ exam_id: examId });
                      }}
                    />
                  </Space>
                )}
              </Card>
            </Col>
          </Row>
        </Space>
      </Content>

      <QuestionListModal
        open={isSmallScreen && isQuestionListOpen}
        onClose={() => setIsQuestionListOpen(false)}
        questionMap={questionMap}
        currentIndex={currentIndex}
        onSelect={handleSelectQuestion}
      />
    </Layout>
  );
};

export default ExamInterface;
